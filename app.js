const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const hint = document.getElementById('hint');
const clearBtn = document.getElementById('clearBtn');
const layerMenuBtn = document.getElementById('layerMenuBtn');
const layerPanel = document.getElementById('layerPanel');
const layerGrid = document.getElementById('layerGrid');
const layerTrack = document.getElementById('layerTrack');
const layerClearance = document.getElementById('layerClearance');
const layerPlatform = document.getElementById('layerPlatform');
const layerTrain = document.getElementById('layerTrain');
const layerRuler = document.getElementById('layerRuler');
const modeButtons = Array.from(document.querySelectorAll('.tool[data-mode]'));
const gridSizeSelect = document.getElementById('gridSizeSelect');
const snapToggle = document.getElementById('snapToggle');
const orthoToggle = document.getElementById('orthoToggle');
const trackWidthRange = document.getElementById('trackWidthRange');
const trackWidthLabel = document.getElementById('trackWidthLabel');
const minTrackLenRange = document.getElementById('minTrackLenRange');
const minTrackLenLabel = document.getElementById('minTrackLenLabel');

const DOT_CM = 100; // 1 grid cell = 1m
const CLEARANCE_HALF_WIDTH_DOT = 1.5; // 1500mm each side (3000mm total)
const TRAIN_DIM = {
  carLengthDot: 20,
  carHeightDot: 2.8,
  carGapDot: 0.8,
  headWidthDot: 2.8,
  headHeightDot: 3
};

const state = {
  mode: 'select',
  tracks: [],
  platforms: [],
  trains: [],
  selection: null,
  draggingSelection: false,
  lastDragWorld: null,
  mousePreview: null,
  draftingTrackStart: null,
  draftingPlatformStart: null,
  draftingPlatformCurrent: null,
  view: {
    zoom: 5,
    minZoom: 0.08,
    maxZoom: 26,
    offsetX: 0,
    offsetY: 0,
    panning: false,
    panLastScreen: null,
    panRenderQueued: false
  },
  settings: {
    gridSize: 1,
    snap: true,
    ortho: false,
    trackWidth: 1.8,
    minTrackLength: 3
  },
  layers: {
    grid: true,
    track: true,
    clearance: true,
    platform: true,
    train: true,
    ruler: true
  }
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function snap(v, gridSize) {
  return Math.round(v / gridSize) * gridSize;
}

function toCanvasScreenPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) / r.width) * canvas.width,
    y: ((ev.clientY - r.top) / r.height) * canvas.height
  };
}

function screenToWorld(p) {
  return {
    x: (p.x - state.view.offsetX) / state.view.zoom,
    y: (p.y - state.view.offsetY) / state.view.zoom
  };
}

function toCanvasPoint(ev) {
  return screenToWorld(toCanvasScreenPoint(ev));
}

function quantizePoint(point) {
  if (!state.settings.snap) {
    return { x: point.x, y: point.y };
  }
  const gs = state.settings.gridSize;
  return {
    x: snap(point.x, gs),
    y: snap(point.y, gs)
  };
}

function applyTrackConstraint(point, startPoint = null) {
  const snapped = quantizePoint(point);
  if (!state.settings.ortho || !startPoint) {
    return snapped;
  }

  const dx = snapped.x - startPoint.x;
  const dy = snapped.y - startPoint.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: snapped.x, y: startPoint.y };
  }
  return { x: startPoint.x, y: snapped.y };
}

function setMode(mode) {
  state.mode = mode;
  state.draftingTrackStart = null;
  state.draftingPlatformStart = null;
  state.draftingPlatformCurrent = null;
  state.draggingSelection = false;
  state.lastDragWorld = null;

  for (const btn of modeButtons) {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  }

  const hints = {
    select: 'Select: クリックで選択 / ドラッグで移動 / Deleteで削除',
    track: 'Track: 2クリックで敷設 / Wheel: Zoom / 右ドラッグ: Pan',
    platform: 'Platform: ドラッグでホーム範囲を作成',
    train: 'Train: 線路近くをクリックして先頭車を配置',
    car: 'Add Car: 列車をクリックして車両を追加',
    erase: 'Erase: クリックした要素を削除'
  };
  hint.textContent = hints[mode];
  render();
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestPointOnSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 0.0001) {
    return { x: a.x, y: a.y, t: 0, dist: distance(p, a), angle: 0 };
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const x = a.x + dx * t;
  const y = a.y + dy * t;
  return { x, y, t, dist: Math.hypot(p.x - x, p.y - y), angle: Math.atan2(dy, dx) };
}

function closestTrackProjection(p) {
  let best = null;
  for (const seg of state.tracks) {
    const pr = nearestPointOnSegment(p, seg.a, seg.b);
    if (!best || pr.dist < best.dist) {
      best = pr;
    }
  }
  return best;
}

function endpointKey(p) {
  return `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
}

function collectTrackNodeCounts() {
  const counts = new Map();
  for (const seg of state.tracks) {
    const ka = endpointKey(seg.a);
    const kb = endpointKey(seg.b);
    counts.set(ka, (counts.get(ka) || 0) + 1);
    counts.set(kb, (counts.get(kb) || 0) + 1);
  }
  return counts;
}

function drawGrid() {
  const grid = state.settings.gridSize;
  const majorEvery = 5;

  // Keep grid line density bounded so pan/zoom stays responsive.
  const minMinorGapPx = 14;
  let minorStep = grid;
  const pxPerGrid = grid * state.view.zoom;
  if (pxPerGrid > 0 && pxPerGrid < minMinorGapPx) {
    minorStep = grid * Math.ceil(minMinorGapPx / pxPerGrid);
  }
  const majorStep = minorStep * majorEvery;

  const worldMinX = -state.view.offsetX / state.view.zoom;
  const worldMaxX = (canvas.width - state.view.offsetX) / state.view.zoom;
  const worldMinY = -state.view.offsetY / state.view.zoom;
  const worldMaxY = (canvas.height - state.view.offsetY) / state.view.zoom;

  const startX = Math.floor(worldMinX / minorStep) * minorStep;
  const startY = Math.floor(worldMinY / minorStep) * minorStep;

  // Minor grid lines (square graph paper feel).
  ctx.strokeStyle = 'rgba(186, 186, 186, 0.55)';
  ctx.lineWidth = 0.02;
  for (let x = startX; x <= worldMaxX + minorStep; x += minorStep) {
    ctx.beginPath();
    ctx.moveTo(x, worldMinY);
    ctx.lineTo(x, worldMaxY);
    ctx.stroke();
  }
  for (let y = startY; y <= worldMaxY + minorStep; y += minorStep) {
    ctx.beginPath();
    ctx.moveTo(worldMinX, y);
    ctx.lineTo(worldMaxX, y);
    ctx.stroke();
  }

  // Major grid lines every 5 cells.
  ctx.strokeStyle = 'rgba(142, 142, 142, 0.72)';
  ctx.lineWidth = 0.04;
  for (let x = Math.floor(worldMinX / majorStep) * majorStep; x <= worldMaxX + majorStep; x += majorStep) {
    ctx.beginPath();
    ctx.moveTo(x, worldMinY);
    ctx.lineTo(x, worldMaxY);
    ctx.stroke();
  }
  for (let y = Math.floor(worldMinY / majorStep) * majorStep; y <= worldMaxY + majorStep; y += majorStep) {
    ctx.beginPath();
    ctx.moveTo(worldMinX, y);
    ctx.lineTo(worldMaxX, y);
    ctx.stroke();
  }
}

function formatCmLabel(cm) {
  if (Math.abs(cm) >= 100) {
    return `${(cm / 100).toFixed(1)}m`;
  }
  return `${Math.round(cm)}cm`;
}

function drawRuler() {
  const rulerHeight = 24;
  const worldLeft = (-state.view.offsetX) / state.view.zoom;
  const worldRight = (canvas.width - state.view.offsetX) / state.view.zoom;
  const baseStep = state.settings.gridSize;

  // Keep major ticks readable on screen regardless of zoom.
  let labelStep = baseStep * 5;
  while (labelStep * state.view.zoom < 58) {
    labelStep *= 2;
  }

  const minorStep = labelStep / 5;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = 'rgba(244, 244, 244, 0.95)';
  ctx.fillRect(0, 0, canvas.width, rulerHeight);
  ctx.strokeStyle = 'rgba(138, 138, 138, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, rulerHeight - 0.5);
  ctx.lineTo(canvas.width, rulerHeight - 0.5);
  ctx.stroke();

  const firstTick = Math.floor(worldLeft / minorStep) * minorStep;
  for (let wx = firstTick; wx <= worldRight + minorStep; wx += minorStep) {
    const sx = wx * state.view.zoom + state.view.offsetX;
    if (sx < -1 || sx > canvas.width + 1) {
      continue;
    }

    const onMajor = Math.abs((wx / labelStep) - Math.round(wx / labelStep)) < 0.001;
    const tickTop = onMajor ? 6 : 12;
    ctx.strokeStyle = onMajor ? 'rgba(92, 92, 92, 0.95)' : 'rgba(138, 138, 138, 0.75)';
    ctx.beginPath();
    ctx.moveTo(sx + 0.5, tickTop);
    ctx.lineTo(sx + 0.5, rulerHeight - 1);
    ctx.stroke();

    if (onMajor) {
      const cm = wx * DOT_CM;
      ctx.fillStyle = '#404040';
      ctx.font = '11px "Yu Gothic UI"';
      ctx.fillText(formatCmLabel(cm), sx + 3, 11);
    }
  }

  ctx.restore();
}

function drawTracks() {
  const baseScreenWidth = state.settings.trackWidth * state.view.zoom;
  const trackScreenWidth = Math.max(baseScreenWidth, 2.8);
  const trackWorldWidth = trackScreenWidth / state.view.zoom;
  const previewScreenWidth = Math.max(trackScreenWidth * 0.72, 1.8);
  const previewWorldWidth = previewScreenWidth / state.view.zoom;
  const nodeCounts = collectTrackNodeCounts();

  ctx.strokeStyle = '#25698a';
  ctx.lineWidth = trackWorldWidth;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (const seg of state.tracks) {
    ctx.beginPath();
    ctx.moveTo(seg.a.x, seg.a.y);
    ctx.lineTo(seg.b.x, seg.b.y);
    ctx.stroke();
  }

  // Keep rounded appearance at branch/connection nodes only.
  ctx.fillStyle = '#25698a';
  const joinRadius = trackWorldWidth * 0.51;
  for (const seg of state.tracks) {
    const aCount = nodeCounts.get(endpointKey(seg.a)) || 0;
    const bCount = nodeCounts.get(endpointKey(seg.b)) || 0;
    if (aCount >= 2) {
      ctx.beginPath();
      ctx.arc(seg.a.x, seg.a.y, joinRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (bCount >= 2) {
      ctx.beginPath();
      ctx.arc(seg.b.x, seg.b.y, joinRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (state.mode === 'track' && state.draftingTrackStart) {
    ctx.strokeStyle = 'rgba(37, 105, 138, 0.55)';
    ctx.setLineDash([0.8, 0.6]);
    ctx.lineWidth = previewWorldWidth;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(state.draftingTrackStart.x, state.draftingTrackStart.y);
    ctx.lineTo(
      state.mousePreview?.x ?? state.draftingTrackStart.x,
      state.mousePreview?.y ?? state.draftingTrackStart.y
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (state.mode === 'track' && state.mousePreview) {
    const p = state.mousePreview;
    const hasStart = Boolean(state.draftingTrackStart);
    const ringRadius = hasStart ? 1.5 : 1.9;
    const innerRadius = hasStart ? 0.28 : 0.34;

    // Cursor-following pick marker for the next click position.
    ctx.strokeStyle = hasStart ? 'rgba(22, 138, 206, 0.95)' : 'rgba(23, 116, 182, 0.95)';
    ctx.lineWidth = clamp(1.6 / state.view.zoom, 0.14, 0.5);
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = hasStart ? 'rgba(58, 164, 223, 0.92)' : 'rgba(45, 136, 197, 0.92)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, innerRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.selection && state.selection.type === 'track') {
    const seg = state.tracks[state.selection.index];
    if (seg) {
      const selectedWorldWidth = (trackScreenWidth + 1.8) / state.view.zoom;
      ctx.strokeStyle = 'rgba(10, 130, 220, 0.95)';
      ctx.lineWidth = selectedWorldWidth;
      ctx.lineCap = 'butt';
      ctx.setLineDash([0.5, 0.35]);
      ctx.beginPath();
      ctx.moveTo(seg.a.x, seg.a.y);
      ctx.lineTo(seg.b.x, seg.b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawTrackClearance() {
  const dashOn = 6 / state.view.zoom;
  const dashOff = 4 / state.view.zoom;
  const lineWidth = clamp(1.2 / state.view.zoom, 0.09, 0.4);

  ctx.strokeStyle = 'rgba(35, 145, 205, 0.72)';
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([dashOn, dashOff]);
  ctx.lineCap = 'round';

  for (const seg of state.tracks) {
    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) {
      continue;
    }

    const nx = -dy / len;
    const ny = dx / len;
    const ox = nx * CLEARANCE_HALF_WIDTH_DOT;
    const oy = ny * CLEARANCE_HALF_WIDTH_DOT;

    ctx.beginPath();
    ctx.moveTo(seg.a.x + ox, seg.a.y + oy);
    ctx.lineTo(seg.b.x + ox, seg.b.y + oy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(seg.a.x - ox, seg.a.y - oy);
    ctx.lineTo(seg.b.x - ox, seg.b.y - oy);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawPlatforms() {
  for (const p of state.platforms) {
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  if (state.mode === 'platform' && state.draftingPlatformStart && state.draftingPlatformCurrent) {
    const x = Math.min(state.draftingPlatformStart.x, state.draftingPlatformCurrent.x);
    const y = Math.min(state.draftingPlatformStart.y, state.draftingPlatformCurrent.y);
    const w = Math.abs(state.draftingPlatformStart.x - state.draftingPlatformCurrent.x);
    const h = Math.abs(state.draftingPlatformStart.y - state.draftingPlatformCurrent.y);

    ctx.fillStyle = 'rgba(138, 138, 138, 0.45)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 0.14;
    ctx.strokeRect(x, y, w, h);
  }

  if (state.selection && state.selection.type === 'platform') {
    const p = state.platforms[state.selection.index];
    if (p) {
      ctx.strokeStyle = 'rgba(10, 130, 220, 0.95)';
      ctx.lineWidth = 0.24;
      ctx.setLineDash([0.6, 0.4]);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.setLineDash([]);
    }
  }
}

function drawTrain(train) {
  const spacing = TRAIN_DIM.carLengthDot + TRAIN_DIM.carGapDot;
  const carW = TRAIN_DIM.carLengthDot;
  const carH = TRAIN_DIM.carHeightDot;

  ctx.save();
  ctx.translate(train.x, train.y);
  ctx.rotate(train.angle);

  for (let i = 0; i < train.cars; i += 1) {
    const cx = i * spacing;
    ctx.fillStyle = '#f2a386';
    ctx.strokeStyle = '#ef7f50';
    ctx.lineWidth = 0.26;
    ctx.fillRect(cx, -carH / 2, carW, carH);
    ctx.strokeRect(cx, -carH / 2, carW, carH);
  }

  // Front icon-like head
  ctx.fillStyle = '#151515';
  ctx.fillRect(-6, -TRAIN_DIM.headHeightDot / 2, TRAIN_DIM.headWidthDot, TRAIN_DIM.headHeightDot);
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(-4.5, -10.5, 24, 9.2);
  ctx.fillStyle = '#5cc7ff';
  ctx.fillRect(-3.7, -8.7, 21, 5.4);
  ctx.fillStyle = '#3f3f3f';
  ctx.fillRect(-4.5, 2.2, 24, 10.2);

  ctx.restore();
}

function drawTrains() {
  for (let i = 0; i < state.trains.length; i += 1) {
    const tr = state.trains[i];
    drawTrain(tr);
    if (state.selection && state.selection.type === 'train' && state.selection.index === i) {
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.rotate(tr.angle);
      ctx.strokeStyle = 'rgba(10, 130, 220, 0.95)';
      ctx.lineWidth = 0.25;
      ctx.setLineDash([0.7, 0.45]);
      const spacing = TRAIN_DIM.carLengthDot + TRAIN_DIM.carGapDot;
      const totalLen = Math.max(spacing, tr.cars * spacing + 8);
      ctx.strokeRect(-8, -TRAIN_DIM.headHeightDot / 2 - 2, totalLen, TRAIN_DIM.headHeightDot + 4);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.setTransform(state.view.zoom, 0, 0, state.view.zoom, state.view.offsetX, state.view.offsetY);
  if (state.layers.grid) {
    drawGrid();
  }
  if (state.layers.track) {
    drawTracks();
  }
  if (state.layers.clearance) {
    drawTrackClearance();
  }
  if (state.layers.platform) {
    drawPlatforms();
  }
  if (state.layers.train) {
    drawTrains();
  }
  ctx.restore();
  if (state.layers.ruler) {
    drawRuler();
  }
}

function eraseAt(point) {
  // Train first
  for (let i = state.trains.length - 1; i >= 0; i -= 1) {
    const tr = state.trains[i];
    if (distance(point, tr) < 2.2) {
      state.trains.splice(i, 1);
      return true;
    }
  }

  for (let i = state.platforms.length - 1; i >= 0; i -= 1) {
    const p = state.platforms[i];
    if (point.x >= p.x && point.x <= p.x + p.w && point.y >= p.y && point.y <= p.y + p.h) {
      state.platforms.splice(i, 1);
      return true;
    }
  }

  for (let i = state.tracks.length - 1; i >= 0; i -= 1) {
    const seg = state.tracks[i];
    const pr = nearestPointOnSegment(point, seg.a, seg.b);
    if (pr.dist < state.settings.trackWidth + 0.8) {
      state.tracks.splice(i, 1);
      return true;
    }
  }

  return false;
}

function pickEntityAt(point) {
  // Train first
  for (let i = state.trains.length - 1; i >= 0; i -= 1) {
    const tr = state.trains[i];
    if (distance(point, tr) < 2.4) {
      return { type: 'train', index: i };
    }
  }

  for (let i = state.platforms.length - 1; i >= 0; i -= 1) {
    const p = state.platforms[i];
    if (point.x >= p.x && point.x <= p.x + p.w && point.y >= p.y && point.y <= p.y + p.h) {
      return { type: 'platform', index: i };
    }
  }

  for (let i = state.tracks.length - 1; i >= 0; i -= 1) {
    const seg = state.tracks[i];
    const pr = nearestPointOnSegment(point, seg.a, seg.b);
    if (pr.dist < state.settings.trackWidth + 0.9) {
      return { type: 'track', index: i };
    }
  }

  return null;
}

function moveSelectionBy(dx, dy) {
  if (!state.selection) {
    return;
  }

  if (state.selection.type === 'track') {
    const seg = state.tracks[state.selection.index];
    if (!seg) {
      return;
    }
    seg.a.x += dx;
    seg.a.y += dy;
    seg.b.x += dx;
    seg.b.y += dy;
    return;
  }

  if (state.selection.type === 'platform') {
    const p = state.platforms[state.selection.index];
    if (!p) {
      return;
    }
    p.x += dx;
    p.y += dy;
    return;
  }

  if (state.selection.type === 'train') {
    const tr = state.trains[state.selection.index];
    if (!tr) {
      return;
    }
    tr.x += dx;
    tr.y += dy;
  }
}

function deleteSelection() {
  if (!state.selection) {
    return;
  }

  if (state.selection.type === 'track') {
    state.tracks.splice(state.selection.index, 1);
  }
  if (state.selection.type === 'platform') {
    state.platforms.splice(state.selection.index, 1);
  }
  if (state.selection.type === 'train') {
    state.trains.splice(state.selection.index, 1);
  }
  state.selection = null;
}

canvas.addEventListener('contextmenu', (ev) => {
  ev.preventDefault();
});

canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const screen = toCanvasScreenPoint(ev);
  const worldBefore = screenToWorld(screen);

  const zoomFactor = ev.deltaY < 0 ? 1.13 : 0.74;
  const nextZoom = clamp(state.view.zoom * zoomFactor, state.view.minZoom, state.view.maxZoom);
  if (nextZoom === state.view.zoom) {
    return;
  }

  state.view.zoom = nextZoom;
  state.view.offsetX = screen.x - worldBefore.x * state.view.zoom;
  state.view.offsetY = screen.y - worldBefore.y * state.view.zoom;
  render();
}, { passive: false });

canvas.addEventListener('mousemove', (ev) => {
  const screen = toCanvasScreenPoint(ev);

  if (state.view.panning && state.view.panLastScreen) {
    const dx = screen.x - state.view.panLastScreen.x;
    const dy = screen.y - state.view.panLastScreen.y;
    state.view.offsetX += dx;
    state.view.offsetY += dy;
    state.view.panLastScreen = screen;
    if (!state.view.panRenderQueued) {
      state.view.panRenderQueued = true;
      requestAnimationFrame(() => {
        state.view.panRenderQueued = false;
        render();
      });
    }
    return;
  }

  const raw = screenToWorld(screen);

  if (state.mode === 'select' && state.draggingSelection && state.lastDragWorld && state.selection) {
    let target = raw;
    if (state.settings.snap) {
      target = quantizePoint(raw);
    }
    const dx = target.x - state.lastDragWorld.x;
    const dy = target.y - state.lastDragWorld.y;
    if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
      moveSelectionBy(dx, dy);
      state.lastDragWorld = target;
      render();
    }
    return;
  }

  const p = state.mode === 'track' ? applyTrackConstraint(raw, state.draftingTrackStart) : quantizePoint(raw);
  state.mousePreview = p;
  if (state.mode === 'platform' && state.draftingPlatformStart) {
    state.draftingPlatformCurrent = p;
  }
  render();
});

canvas.addEventListener('mousedown', (ev) => {
  if (ev.button === 1 || ev.button === 2) {
    state.view.panning = true;
    state.view.panLastScreen = toCanvasScreenPoint(ev);
    return;
  }

  if (ev.button !== 0) {
    return;
  }

  const raw = toCanvasPoint(ev);

  if (state.mode === 'select') {
    const p = quantizePoint(raw);
    state.selection = pickEntityAt(raw);
    if (state.selection) {
      state.draggingSelection = true;
      state.lastDragWorld = state.settings.snap ? p : raw;
    } else {
      state.draggingSelection = false;
      state.lastDragWorld = null;
    }
    render();
    return;
  }

  const p = state.mode === 'track' ? applyTrackConstraint(raw, state.draftingTrackStart) : quantizePoint(raw);

  if (state.mode === 'track') {
    if (!state.draftingTrackStart) {
      state.draftingTrackStart = p;
    } else {
      if (distance(state.draftingTrackStart, p) >= state.settings.minTrackLength) {
        state.tracks.push({ a: state.draftingTrackStart, b: p });
      }
      state.draftingTrackStart = null;
    }
    render();
    return;
  }

  if (state.mode === 'platform') {
    state.draftingPlatformStart = p;
    state.draftingPlatformCurrent = p;
    render();
    return;
  }

  if (state.mode === 'train') {
    const pr = closestTrackProjection(p);
    if (pr && pr.dist <= 0.9) {
      state.trains.push({
        x: pr.x,
        y: pr.y,
        angle: pr.angle,
        cars: 4
      });
      render();
    }
    return;
  }

  if (state.mode === 'car') {
    let best = null;
    for (const tr of state.trains) {
      const d = distance(p, tr);
      if (!best || d < best.dist) {
        best = { tr, dist: d };
      }
    }
    if (best && best.dist < 3.2) {
      best.tr.cars = Math.min(10, best.tr.cars + 1);
      render();
    }
    return;
  }

  if (state.mode === 'erase') {
    eraseAt(raw);
    render();
  }
});

canvas.addEventListener('mouseup', () => {
  if (state.view.panning) {
    state.view.panning = false;
    state.view.panLastScreen = null;
    return;
  }

  if (state.mode === 'select' && state.draggingSelection) {
    state.draggingSelection = false;
    state.lastDragWorld = null;
    return;
  }

  if (state.mode !== 'platform' || !state.draftingPlatformStart || !state.draftingPlatformCurrent) {
    return;
  }

  const x = Math.min(state.draftingPlatformStart.x, state.draftingPlatformCurrent.x);
  const y = Math.min(state.draftingPlatformStart.y, state.draftingPlatformCurrent.y);
  const w = Math.abs(state.draftingPlatformStart.x - state.draftingPlatformCurrent.x);
  const h = Math.abs(state.draftingPlatformStart.y - state.draftingPlatformCurrent.y);

  if (w > 1 && h > 1) {
    state.platforms.push({ x, y, w, h });
  }

  state.draftingPlatformStart = null;
  state.draftingPlatformCurrent = null;
  render();
});

clearBtn.addEventListener('click', () => {
  state.tracks = [];
  state.platforms = [];
  state.trains = [];
  state.draftingTrackStart = null;
  state.draftingPlatformStart = null;
  state.draftingPlatformCurrent = null;
  render();
});

layerMenuBtn.addEventListener('click', () => {
  layerPanel.hidden = !layerPanel.hidden;
  layerMenuBtn.classList.toggle('active', !layerPanel.hidden);
});

layerGrid.addEventListener('change', () => {
  state.layers.grid = layerGrid.checked;
  render();
});

layerTrack.addEventListener('change', () => {
  state.layers.track = layerTrack.checked;
  render();
});

layerClearance.addEventListener('change', () => {
  state.layers.clearance = layerClearance.checked;
  render();
});

layerPlatform.addEventListener('change', () => {
  state.layers.platform = layerPlatform.checked;
  render();
});

layerTrain.addEventListener('change', () => {
  state.layers.train = layerTrain.checked;
  render();
});

layerRuler.addEventListener('change', () => {
  state.layers.ruler = layerRuler.checked;
  render();
});

for (const btn of modeButtons) {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
}

function refreshSettingLabels() {
  trackWidthLabel.textContent = `${state.settings.trackWidth.toFixed(1)}m`;
  const cm = Math.round(state.settings.minTrackLength * DOT_CM);
  minTrackLenLabel.textContent = `${state.settings.minTrackLength.toFixed(1)}m (${cm}cm)`;
}

gridSizeSelect.addEventListener('change', () => {
  state.settings.gridSize = Number(gridSizeSelect.value);
  render();
});

snapToggle.addEventListener('change', () => {
  state.settings.snap = snapToggle.checked;
  render();
});

orthoToggle.addEventListener('change', () => {
  state.settings.ortho = orthoToggle.checked;
  render();
});

trackWidthRange.addEventListener('input', () => {
  state.settings.trackWidth = Number(trackWidthRange.value);
  refreshSettingLabels();
  render();
});

minTrackLenRange.addEventListener('input', () => {
  state.settings.minTrackLength = Number(minTrackLenRange.value);
  refreshSettingLabels();
});

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    state.draftingTrackStart = null;
    state.draftingPlatformStart = null;
    state.draftingPlatformCurrent = null;
    state.draggingSelection = false;
    state.lastDragWorld = null;
    render();
  }

  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    if (state.mode === 'select' && state.selection) {
      ev.preventDefault();
      deleteSelection();
      render();
    }
  }

  if (ev.key.toLowerCase() === 'l') {
    layerPanel.hidden = !layerPanel.hidden;
    layerMenuBtn.classList.toggle('active', !layerPanel.hidden);
  }
});

// Start with a composition close to the sample image scale.
state.view.offsetX = canvas.width * 0.05;
state.view.offsetY = canvas.height * 0.62;
refreshSettingLabels();
render();
