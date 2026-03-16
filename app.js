const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const hint = document.getElementById('hint');
const clearBtn = document.getElementById('clearBtn');
const modeButtons = Array.from(document.querySelectorAll('.tool[data-mode]'));
const gridSizeSelect = document.getElementById('gridSizeSelect');
const snapToggle = document.getElementById('snapToggle');
const orthoToggle = document.getElementById('orthoToggle');
const trackWidthRange = document.getElementById('trackWidthRange');
const trackWidthLabel = document.getElementById('trackWidthLabel');
const minTrackLenRange = document.getElementById('minTrackLenRange');
const minTrackLenLabel = document.getElementById('minTrackLenLabel');

const DOT_CM = 10;

const state = {
  mode: 'track',
  tracks: [],
  platforms: [],
  trains: [],
  mousePreview: null,
  draftingTrackStart: null,
  draftingPlatformStart: null,
  draftingPlatformCurrent: null,
  view: {
    zoom: 5,
    minZoom: 2,
    maxZoom: 26,
    offsetX: 0,
    offsetY: 0,
    panning: false,
    panLastScreen: null
  },
  settings: {
    gridSize: 1,
    snap: true,
    ortho: false,
    trackWidth: 1.4,
    minTrackLength: 3
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

  for (const btn of modeButtons) {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  }

  const hints = {
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

function drawGrid() {
  const grid = state.settings.gridSize;
  const majorEvery = 5;
  const majorStep = grid * majorEvery;

  const worldMinX = -state.view.offsetX / state.view.zoom;
  const worldMaxX = (canvas.width - state.view.offsetX) / state.view.zoom;
  const worldMinY = -state.view.offsetY / state.view.zoom;
  const worldMaxY = (canvas.height - state.view.offsetY) / state.view.zoom;

  const startX = Math.floor(worldMinX / grid) * grid;
  const startY = Math.floor(worldMinY / grid) * grid;

  // Minor grid lines (square graph paper feel).
  ctx.strokeStyle = 'rgba(186, 186, 186, 0.55)';
  ctx.lineWidth = 0.02;
  for (let x = startX; x <= worldMaxX + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, worldMinY);
    ctx.lineTo(x, worldMaxY);
    ctx.stroke();
  }
  for (let y = startY; y <= worldMaxY + grid; y += grid) {
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
  ctx.strokeStyle = '#25698a';
  ctx.lineWidth = state.settings.trackWidth;
  ctx.lineCap = 'round';
  for (const seg of state.tracks) {
    ctx.beginPath();
    ctx.moveTo(seg.a.x, seg.a.y);
    ctx.lineTo(seg.b.x, seg.b.y);
    ctx.stroke();
  }

  if (state.mode === 'track' && state.draftingTrackStart) {
    ctx.strokeStyle = 'rgba(37, 105, 138, 0.55)';
    ctx.setLineDash([0.8, 0.6]);
    ctx.lineWidth = Math.max(0.25, state.settings.trackWidth * 0.75);
    ctx.beginPath();
    ctx.moveTo(state.draftingTrackStart.x, state.draftingTrackStart.y);
    ctx.lineTo(
      state.mousePreview?.x ?? state.draftingTrackStart.x,
      state.mousePreview?.y ?? state.draftingTrackStart.y
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }
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
}

function drawTrain(train) {
  const spacing = 34;
  const carW = 32;
  const carH = 6.8;

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
  ctx.fillRect(-2.8, -4.8, 8.4, 9.6);
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(-2.0, -3.8, 6.8, 3.2);
  ctx.fillStyle = '#5cc7ff';
  ctx.fillRect(-1.6, -3.2, 6.0, 2.0);
  ctx.fillStyle = '#3f3f3f';
  ctx.fillRect(-2.0, 0.6, 6.8, 3.2);

  ctx.restore();
}

function drawTrains() {
  for (const tr of state.trains) {
    drawTrain(tr);
  }
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.setTransform(state.view.zoom, 0, 0, state.view.zoom, state.view.offsetX, state.view.offsetY);
  drawGrid();
  drawTracks();
  drawPlatforms();
  drawTrains();
  ctx.restore();
  drawRuler();
}

function eraseAt(point) {
  // Train first
  for (let i = state.trains.length - 1; i >= 0; i -= 1) {
    const tr = state.trains[i];
    if (distance(point, tr) < 8) {
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

canvas.addEventListener('contextmenu', (ev) => {
  ev.preventDefault();
});

canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const screen = toCanvasScreenPoint(ev);
  const worldBefore = screenToWorld(screen);

  const zoomFactor = ev.deltaY < 0 ? 1.13 : 0.885;
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
    render();
    return;
  }

  const raw = screenToWorld(screen);
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
    if (pr && pr.dist <= 4.5) {
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
    if (best && best.dist < 12) {
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

for (const btn of modeButtons) {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
}

function refreshSettingLabels() {
  trackWidthLabel.textContent = `${state.settings.trackWidth.toFixed(1)} dot`;
  const cm = Math.round(state.settings.minTrackLength * DOT_CM);
  minTrackLenLabel.textContent = `${state.settings.minTrackLength.toFixed(1)} dot (${cm}cm)`;
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
    render();
  }
});

// Start with a composition close to the sample image scale.
state.view.offsetX = canvas.width * 0.05;
state.view.offsetY = canvas.height * 0.62;
refreshSettingLabels();
render();
