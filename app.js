const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const hint = document.getElementById('hint');
const titleScreen = document.getElementById('titleScreen');
const titleMainMenu = document.getElementById('titleMainMenu');
const titleNewGameBtn = document.getElementById('titleNewGameBtn');
const titleLoadGameBtn = document.getElementById('titleLoadGameBtn');
const titleContinueBtn = document.getElementById('titleContinueBtn');
const titleExitBtn = document.getElementById('titleExitBtn');
const titleInfo = document.getElementById('titleInfo');
const clearBtn = document.getElementById('clearBtn');
const quickSaveBtn = document.getElementById('quickSaveBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const loadFileInput = document.getElementById('loadFileInput');
const layerMenuBtn = document.getElementById('layerMenuBtn');
const layerPanel = document.getElementById('layerPanel');
const layerGrid = document.getElementById('layerGrid');
const layerTrack = document.getElementById('layerTrack');
const layerClearance = document.getElementById('layerClearance');
const layerPlatform = document.getElementById('layerPlatform');
const layerTrain = document.getElementById('layerTrain');
const modeButtons = Array.from(document.querySelectorAll('.tool[data-mode]'));
const zoomStat = document.getElementById('zoomStat');
const countStat = document.getElementById('countStat');
const saveNotice = document.getElementById('saveNotice');
const gridSizeSelect = document.getElementById('gridSizeSelect');
const snapToggle = document.getElementById('snapToggle');
const orthoToggle = document.getElementById('orthoToggle');
const trackWidthRange = document.getElementById('trackWidthRange');
const trackWidthLabel = document.getElementById('trackWidthLabel');
const trackLevelInput = document.getElementById('trackLevelInput');
const trackLineTypeSelect = document.getElementById('trackLineTypeSelect');
const trackColorInput = document.getElementById('trackColorInput');
const minTrackLenRange = document.getElementById('minTrackLenRange');
const minTrackLenLabel = document.getElementById('minTrackLenLabel');

const UNIT_LABEL = 'u';
const CLEARANCE_HALF_WIDTH_DOT = 2; // 2 units each side
const PAPER_COLOR = '#ffffff';
const ZOOM_BASELINE = 13.9; // Treat 1390% as 0% in status display.
const PLATFORM_WIDTH_DOT = 0.22;
const PLATFORM_MIN_LENGTH_DOT = 0.6;
const PLATFORM_INTERACT_RADIUS_DOT = 0.72;
const TRACK_BODY_ALPHA = 0.78;
const QUICK_SAVE_KEY = 'transitnexus.quickSave.v1';
const LAST_SELECTED_SAVE_KEY = 'transitnexus.lastSelectedSave.v1';
const TRACK_TOPOLOGY_SNAP_TOLERANCE = 0.35;
const DEFAULT_OFFSET_X_RATIO = 0.05;
const DEFAULT_OFFSET_Y_RATIO = 0.62;
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
  selectionMoved: false,
  lastDragWorld: null,
  mousePreview: null,
  draftingTrackStart: null,
  draftingPlatformStart: null,
  draftingPlatformCurrent: null,
  view: {
    zoom: ZOOM_BASELINE,
    minZoom: 0.08,
    maxZoom: 26,
    offsetX: 0,
    offsetY: 0,
    panning: false,
    panLastScreen: null,
    panRenderQueued: false,
    renderQueued: false
  },
  settings: {
    gridSize: 1,
    snap: true,
    ortho: false,
    trackWidth: 2,
    trackLevel: 0,
    trackLineType: 'solid',
    trackColor: '#25698a',
    minTrackLength: 1
  },
  layers: {
    grid: true,
    track: true,
    clearance: true,
    platform: true,
    train: true
  },
  history: [],
  future: []
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function requestRender() {
  if (state.view.renderQueued) {
    return;
  }
  state.view.renderQueued = true;
  requestAnimationFrame(() => {
    state.view.renderQueued = false;
    render();
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function snapshotState() {
  return {
    tracks: clone(state.tracks),
    platforms: clone(state.platforms),
    trains: clone(state.trains)
  };
}

function snapshotsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applySnapshot(snap) {
  state.tracks = clone(snap.tracks || []);
  state.platforms = clone(snap.platforms || []);
  state.trains = clone(snap.trains || []);
  state.selection = null;
  state.draggingSelection = false;
  state.selectionMoved = false;
  state.lastDragWorld = null;
  state.draftingTrackStart = null;
  state.draftingPlatformStart = null;
  state.draftingPlatformCurrent = null;
  render();
}

function buildSerializableState() {
  return {
    version: 5,
    unitSystem: UNIT_LABEL,
    savedAt: new Date().toISOString(),
    tracks: clone(state.tracks),
    platforms: clone(state.platforms),
    trains: clone(state.trains),
    settings: {
      gridSize: state.settings.gridSize,
      snap: state.settings.snap,
      ortho: state.settings.ortho,
      trackWidth: state.settings.trackWidth,
      trackLevel: state.settings.trackLevel,
      trackLineType: state.settings.trackLineType,
      trackColor: state.settings.trackColor,
      minTrackLength: state.settings.minTrackLength
    },
    view: {
      zoom: state.view.zoom,
      offsetX: state.view.offsetX,
      offsetY: state.view.offsetY
    }
  };
}

function normalizeLoadedTrackTopology(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return [];
  }

  const result = tracks.map((seg) => ({
    a: { x: seg.a.x, y: seg.a.y },
    b: { x: seg.b.x, y: seg.b.y },
    level: normalizeTrackLevel(seg.level),
    lineType: normalizeTrackLineType(seg.lineType),
    color: normalizeTrackColor(seg.color)
  }));

  const endpoints = [];
  for (let i = 0; i < result.length; i += 1) {
    endpoints.push({ segIndex: i, endpoint: 'a' });
    endpoints.push({ segIndex: i, endpoint: 'b' });
  }

  // Pass 1: merge near endpoint pairs so old saves with tiny coordinate drift connect.
  const parent = endpoints.map((_, i) => i);
  const find = (x) => {
    let p = x;
    while (parent[p] !== p) {
      parent[p] = parent[parent[p]];
      p = parent[p];
    }
    return p;
  };
  const union = (x, y) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) {
      parent[ry] = rx;
    }
  };

  for (let i = 0; i < endpoints.length; i += 1) {
    const ei = endpoints[i];
    const pi = result[ei.segIndex][ei.endpoint];
    for (let j = i + 1; j < endpoints.length; j += 1) {
      const ej = endpoints[j];
      const pj = result[ej.segIndex][ej.endpoint];
      if (distance(pi, pj) <= TRACK_TOPOLOGY_SNAP_TOLERANCE) {
        union(i, j);
      }
    }
  }

  const groups = new Map();
  for (let i = 0; i < endpoints.length; i += 1) {
    const root = find(i);
    if (!groups.has(root)) {
      groups.set(root, []);
    }
    groups.get(root).push(i);
  }

  for (const idxList of groups.values()) {
    if (idxList.length < 2) {
      continue;
    }
    let sx = 0;
    let sy = 0;
    for (const idx of idxList) {
      const ref = endpoints[idx];
      const p = result[ref.segIndex][ref.endpoint];
      sx += p.x;
      sy += p.y;
    }
    const ax = sx / idxList.length;
    const ay = sy / idxList.length;
    for (const idx of idxList) {
      const ref = endpoints[idx];
      result[ref.segIndex][ref.endpoint] = { x: ax, y: ay };
    }
  }

  // Pass 2: snap endpoints that touch another segment interior (branch-on-midpoint).
  for (let i = 0; i < result.length; i += 1) {
    for (const endpoint of ['a', 'b']) {
      const p = result[i][endpoint];
      let best = null;
      for (let j = 0; j < result.length; j += 1) {
        if (i === j) {
          continue;
        }
        const other = result[j];
        const pr = nearestPointOnSegment(p, other.a, other.b);
        if (pr.t <= 0.02 || pr.t >= 0.98) {
          continue;
        }
        if (pr.dist > TRACK_TOPOLOGY_SNAP_TOLERANCE) {
          continue;
        }
        if (!best || pr.dist < best.dist) {
          best = pr;
        }
      }
      if (best) {
        result[i][endpoint] = { x: best.x, y: best.y };
      }
    }
  }

  return result;
}

function sanitizeLoadedState(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const saveVersion = Number.isFinite(Number(safe.version)) ? Number(safe.version) : 1;
  const loadedMinTrackLength = Number(safe.settings?.minTrackLength);
  const migratedMinTrackLength = saveVersion < 3
    ? 1
    : (Number.isFinite(loadedMinTrackLength) ? loadedMinTrackLength : state.settings.minTrackLength);
  const loadedUnit = typeof safe.unitSystem === 'string' ? safe.unitSystem : UNIT_LABEL;
  const normalizedTracks = Array.isArray(safe.tracks)
    ? safe.tracks
      .filter((seg) => seg && seg.a && seg.b)
      .map((seg) => ({
        a: { x: Number(seg.a.x) || 0, y: Number(seg.a.y) || 0 },
        b: { x: Number(seg.b.x) || 0, y: Number(seg.b.y) || 0 },
        level: normalizeTrackLevel(seg.level),
        lineType: normalizeTrackLineType(seg.lineType),
        color: normalizeTrackColor(seg.color)
      }))
    : [];
  const topologyNormalizedTracks = normalizeLoadedTrackTopology(normalizedTracks);
  return {
    tracks: topologyNormalizedTracks,
    platforms: Array.isArray(safe.platforms) ? safe.platforms : [],
    trains: Array.isArray(safe.trains) ? safe.trains : [],
    settings: {
      gridSize: Number(safe.settings?.gridSize) || state.settings.gridSize,
      snap: typeof safe.settings?.snap === 'boolean' ? safe.settings.snap : state.settings.snap,
      ortho: typeof safe.settings?.ortho === 'boolean' ? safe.settings.ortho : state.settings.ortho,
      trackWidth: Number(safe.settings?.trackWidth) || state.settings.trackWidth,
      trackLevel: normalizeTrackLevel(safe.settings?.trackLevel),
      trackLineType: normalizeTrackLineType(safe.settings?.trackLineType),
      trackColor: normalizeTrackColor(safe.settings?.trackColor),
      minTrackLength: migratedMinTrackLength
    },
    view: {
      zoom: clamp(Number(safe.view?.zoom) || state.view.zoom, state.view.minZoom, state.view.maxZoom),
      offsetX: Number(safe.view?.offsetX),
      offsetY: Number(safe.view?.offsetY)
    },
    unitSystem: loadedUnit
  };
}

function applyLoadedState(data) {
  const next = sanitizeLoadedState(data);

  state.tracks = clone(next.tracks);
  state.platforms = clone(next.platforms);
  state.trains = clone(next.trains);

  state.settings.gridSize = clamp(next.settings.gridSize, 1, 5);
  state.settings.snap = next.settings.snap;
  state.settings.ortho = next.settings.ortho;
  state.settings.trackWidth = clamp(next.settings.trackWidth, 1, 8);
  state.settings.trackLevel = next.settings.trackLevel;
  state.settings.trackLineType = next.settings.trackLineType;
  state.settings.trackColor = next.settings.trackColor;
  state.settings.minTrackLength = clamp(next.settings.minTrackLength, 1, 20);

  state.view.zoom = next.view.zoom;
  if (Number.isFinite(next.view.offsetX) && Number.isFinite(next.view.offsetY)) {
    state.view.offsetX = next.view.offsetX;
    state.view.offsetY = next.view.offsetY;
  }

  state.selection = null;
  state.draggingSelection = false;
  state.selectionMoved = false;
  state.lastDragWorld = null;
  state.mousePreview = null;
  state.draftingTrackStart = null;
  state.draftingPlatformStart = null;
  state.draftingPlatformCurrent = null;

  gridSizeSelect.value = String(state.settings.gridSize);
  snapToggle.checked = state.settings.snap;
  orthoToggle.checked = state.settings.ortho;
  trackWidthRange.value = String(Math.round(state.settings.trackWidth));
  minTrackLenRange.value = String(state.settings.minTrackLength);

  refreshSettingLabels();
  commitHistory();
  render();
}

function saveDiagramToFile() {
  const payload = buildSerializableState();
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `transitnexus-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function quickSaveToLocal() {
  const payload = buildSerializableState();
  try {
    localStorage.setItem(QUICK_SAVE_KEY, JSON.stringify(payload));
    const hhmmss = new Date().toLocaleTimeString('ja-JP', { hour12: false });
    setSaveNotice(`QSV: 保存済み ${hhmmss}`);
    return true;
  } catch (_err) {
    setSaveNotice('QSV: 保存失敗', true);
    return false;
  }
}

function restoreQuickSaveFromLocal() {
  const text = localStorage.getItem(QUICK_SAVE_KEY);
  if (!text) {
    return false;
  }

  try {
    const parsed = JSON.parse(text);
    applyLoadedState(parsed);
    return true;
  } catch (_err) {
    localStorage.removeItem(QUICK_SAVE_KEY);
    return false;
  }
}

function restoreLastSelectedSaveFromLocal() {
  const text = localStorage.getItem(LAST_SELECTED_SAVE_KEY);
  if (!text) {
    return false;
  }

  try {
    const parsed = JSON.parse(text);
    applyLoadedState(parsed);
    return true;
  } catch (_err) {
    localStorage.removeItem(LAST_SELECTED_SAVE_KEY);
    return false;
  }
}

function loadDiagramFromFile(file, options = {}) {
  const onSuccess = typeof options.onSuccess === 'function' ? options.onSuccess : null;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      applyLoadedState(parsed);
      localStorage.setItem(LAST_SELECTED_SAVE_KEY, JSON.stringify(parsed));
      setSaveNotice(`LOD: ${file.name}`);
      if (onSuccess) {
        onSuccess();
      }
    } catch (_err) {
      alert('読み込みに失敗しました。JSONファイルを確認してください。');
    }
  };
  reader.onerror = () => {
    alert('ファイルの読み込みに失敗しました。');
  };
  reader.readAsText(file, 'utf-8');
}

function resetDraftingState() {
  state.draftingTrackStart = null;
  state.draftingPlatformStart = null;
  state.draftingPlatformCurrent = null;
  state.draggingSelection = false;
  state.selectionMoved = false;
  state.lastDragWorld = null;
  state.mousePreview = null;
}

function resetViewToDefault() {
  state.view.zoom = ZOOM_BASELINE;
  state.view.offsetX = canvas.width * DEFAULT_OFFSET_X_RATIO;
  state.view.offsetY = canvas.height * DEFAULT_OFFSET_Y_RATIO;
}

function clearAllData() {
  state.tracks = [];
  state.platforms = [];
  state.trains = [];
  state.selection = null;
  resetDraftingState();
}

function resetEditorSettings() {
  state.settings.gridSize = 1;
  state.settings.snap = true;
  state.settings.ortho = false;
  state.settings.trackWidth = 2;
  state.settings.trackLevel = 0;
  state.settings.trackLineType = 'solid';
  state.settings.trackColor = '#25698a';
  state.settings.minTrackLength = 1;

  if (gridSizeSelect) {
    gridSizeSelect.value = '1';
  }
  if (snapToggle) {
    snapToggle.checked = true;
  }
  if (orthoToggle) {
    orthoToggle.checked = false;
  }
  if (trackWidthRange) {
    trackWidthRange.value = '2';
  }
  if (trackLevelInput) {
    trackLevelInput.value = '0';
  }
  if (trackLineTypeSelect) {
    trackLineTypeSelect.value = 'solid';
  }
  if (trackColorInput) {
    trackColorInput.value = '#25698a';
  }
  if (minTrackLenRange) {
    minTrackLenRange.value = '1';
  }
}

function setTitleInfo(message = '', isError = false) {
  if (!titleInfo) {
    return;
  }
  titleInfo.textContent = message;
  titleInfo.style.color = isError ? '#ffd8d8' : '#a8bdd3';
}

function showTitleMain() {
  if (!titleMainMenu) {
    return;
  }
  titleMainMenu.hidden = false;
  setTitleInfo('');
}

let saveNoticeResetTimer = null;
function setSaveNotice(message, isError = false) {
  if (!saveNotice) {
    return;
  }
  saveNotice.textContent = message;
  saveNotice.style.borderColor = isError ? '#8e4e4e' : '#3f4e5f';
  saveNotice.style.background = isError ? '#5c2f34' : '#202a35';
  saveNotice.style.color = isError ? '#ffd8d8' : '#d7e4f2';

  if (saveNoticeResetTimer) {
    clearTimeout(saveNoticeResetTimer);
  }
  saveNoticeResetTimer = setTimeout(() => {
    saveNotice.textContent = 'QSV: -';
    saveNotice.style.borderColor = '#3f4e5f';
    saveNotice.style.background = '#202a35';
    saveNotice.style.color = '#d7e4f2';
  }, 2800);
}

function hideTitleAndEnterEditor() {
  if (titleScreen) {
    titleScreen.hidden = true;
  }
  setMode('track');
  render();
}

function startNewGame() {
  clearAllData();
  resetEditorSettings();
  resetViewToDefault();
  commitHistory();
  refreshSettingLabels();
  hideTitleAndEnterEditor();
}

function isTitleVisible() {
  return Boolean(titleScreen && !titleScreen.hidden);
}

let titleFileLoadPending = false;

function commitHistory() {
  const snap = snapshotState();
  const last = state.history[state.history.length - 1];
  if (!last || !snapshotsEqual(last, snap)) {
    state.history.push(snap);
    if (state.history.length > 300) {
      state.history.shift();
    }
  }
  state.future = [];
}

function undo() {
  if (state.history.length <= 1) {
    return;
  }
  const current = state.history.pop();
  state.future.push(current);
  const prev = state.history[state.history.length - 1];
  applySnapshot(prev);
}

function redo() {
  if (state.future.length === 0) {
    return;
  }
  const next = state.future.pop();
  state.history.push(next);
  applySnapshot(next);
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

function worldToScreen(p) {
  return {
    x: p.x * state.view.zoom + state.view.offsetX,
    y: p.y * state.view.zoom + state.view.offsetY
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
  state.selectionMoved = false;
  state.lastDragWorld = null;

  for (const btn of modeButtons) {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  }

  const hints = {
    select: 'Select: クリックで選択 / ドラッグで移動 / Deleteで削除',
    track: 'Track: 2クリックで敷設 / Altで吸着一時OFF / Wheel: Zoom / 右ドラッグ: Pan',
    platform: 'Platform: 2クリックで敷設（連続入力可） / Escで終了',
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

function platformNodeKey(p) {
  const mergeStep = 0.3;
  const x = Math.round(p.x / mergeStep);
  const y = Math.round(p.y / mergeStep);
  return `${x},${y}`;
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

function getTrackNodes() {
  const nodes = new Map();
  for (const seg of state.tracks) {
    nodes.set(endpointKey(seg.a), seg.a);
    nodes.set(endpointKey(seg.b), seg.b);
  }
  return Array.from(nodes.values());
}

function findNearestTrackNode(point, snapStrength = 'normal') {
  const nodes = getTrackNodes();
  if (nodes.length === 0) {
    return null;
  }

  // Keep snap radius modest so branching remains easy.
  const baseRadiusPx = snapStrength === 'light' ? 5.5 : 8;
  const snapRadiusWorld = clamp(baseRadiusPx / Math.max(0.0001, state.view.zoom), 0.14, 0.45);
  let best = null;
  for (const node of nodes) {
    const d = distance(point, node);
    if (d <= snapRadiusWorld && (!best || d < best.dist)) {
      best = { x: node.x, y: node.y, dist: d };
    }
  }
  return best;
}

function resolveTrackPoint(rawPoint, startPoint, options = {}) {
  const { enableNodeSnap = true } = options;
  const constrained = applyTrackConstraint(rawPoint, startPoint);

  if (!enableNodeSnap) {
    return constrained;
  }

  const nearNode = findNearestTrackNode(constrained, startPoint ? 'light' : 'normal');
  if (nearNode && (!startPoint || distance(startPoint, nearNode) > 0.0001)) {
    return { x: nearNode.x, y: nearNode.y };
  }

  return constrained;
}

function getTrackWorldWidth() {
  const baseScreenWidth = state.settings.trackWidth * state.view.zoom;
  const trackScreenWidth = Math.max(baseScreenWidth, 2.8);
  return trackScreenWidth / state.view.zoom;
}

function getPreviewWorldWidth() {
  const baseScreenWidth = state.settings.trackWidth * state.view.zoom;
  const trackScreenWidth = Math.max(baseScreenWidth, 2.8);
  const previewScreenWidth = Math.max(trackScreenWidth * 0.72, 1.8);
  return previewScreenWidth / state.view.zoom;
}

function getPlatformWorldWidth() {
  const platformScreenWidth = Math.max(PLATFORM_WIDTH_DOT * state.view.zoom, 1.8);
  return platformScreenWidth / Math.max(0.0001, state.view.zoom);
}

function normalizeTrackColor(value) {
  return typeof value === 'string' && value ? value : '#25698a';
}

function normalizeTrackLineType(value) {
  return value === 'dashed' || value === 'dotted' ? value : 'solid';
}

function normalizeTrackLevel(value) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return 0;
  }
  return Math.round(clamp(n, -9, 9));
}

function applyTrackLineStyle(seg) {
  const lineType = normalizeTrackLineType(seg.lineType);
  ctx.strokeStyle = normalizeTrackColor(seg.color);
  if (lineType === 'dashed') {
    ctx.setLineDash([1.15, 0.78]);
    return;
  }
  if (lineType === 'dotted') {
    ctx.setLineDash([0.22, 0.5]);
    return;
  }
  ctx.setLineDash([]);
}

function segmentIntersectionPoint(a1, a2, b1, b2) {
  const r = { x: a2.x - a1.x, y: a2.y - a1.y };
  const s = { x: b2.x - b1.x, y: b2.y - b1.y };
  const denom = r.x * s.y - r.y * s.x;
  if (Math.abs(denom) < 1e-8) {
    return null;
  }

  const qmp = { x: b1.x - a1.x, y: b1.y - a1.y };
  const t = (qmp.x * s.y - qmp.y * s.x) / denom;
  const u = (qmp.x * r.y - qmp.y * r.x) / denom;

  if (t <= 0.001 || t >= 0.999 || u <= 0.001 || u >= 0.999) {
    return null;
  }

  return { x: a1.x + t * r.x, y: a1.y + t * r.y };
}

function drawSegmentSlice(seg, center, halfLength, lineWidth) {
  const dx = seg.b.x - seg.a.x;
  const dy = seg.b.y - seg.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return;
  }

  const ux = dx / len;
  const uy = dy / len;
  const x1 = center.x - ux * halfLength;
  const y1 = center.y - uy * halfLength;
  const x2 = center.x + ux * halfLength;
  const y2 = center.y + uy * halfLength;

  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.globalAlpha = TRACK_BODY_ALPHA;
  applyTrackLineStyle(seg);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawLevelCrossingHints() {
  if (state.tracks.length < 2) {
    return;
  }

  const trackWorldWidth = getTrackWorldWidth();
  const bridgeHalf = Math.max(trackWorldWidth * 1.08, 0.85);

  for (let i = 0; i < state.tracks.length; i += 1) {
    for (let j = i + 1; j < state.tracks.length; j += 1) {
      const segA = state.tracks[i];
      const segB = state.tracks[j];
      const lvA = normalizeTrackLevel(segA.level);
      const lvB = normalizeTrackLevel(segB.level);
      if (lvA === lvB) {
        continue;
      }

      const p = segmentIntersectionPoint(segA.a, segA.b, segB.a, segB.b);
      if (!p) {
        continue;
      }

      const upper = lvA > lvB ? segA : segB;

      ctx.fillStyle = PAPER_COLOR;
      ctx.beginPath();
      ctx.arc(p.x, p.y, trackWorldWidth * 0.72, 0, Math.PI * 2);
      ctx.fill();

      drawSegmentSlice(upper, p, bridgeHalf, trackWorldWidth);
    }
  }

  ctx.setLineDash([]);
}

function drawDeadEndMarkers(nodeCounts) {
  if (state.tracks.length === 0) {
    return;
  }

  const markerHalfLength = 1.5; // +/-1.5u from endpoint
  ctx.lineWidth = getPlatformWorldWidth();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawAtEndpoint = (end, other, segColor) => {
    const dx = other.x - end.x;
    const dy = other.y - end.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      return;
    }

    const nx = -dy / len;
    const ny = dx / len;
    ctx.strokeStyle = normalizeTrackColor(segColor);
    ctx.beginPath();
    ctx.moveTo(end.x - nx * markerHalfLength, end.y - ny * markerHalfLength);
    ctx.lineTo(end.x + nx * markerHalfLength, end.y + ny * markerHalfLength);
    ctx.stroke();
  };

  const isEndpointConnected = (segIndex, endpoint) => {
    if ((nodeCounts.get(endpointKey(endpoint)) || 0) >= 2) {
      return true;
    }

    // Also treat contact with another segment interior as a valid junction.
    const interiorSnapTol = clamp(6 / Math.max(0.0001, state.view.zoom), 0.12, 0.45);
    for (let i = 0; i < state.tracks.length; i += 1) {
      if (i === segIndex) {
        continue;
      }

      const other = state.tracks[i];
      const pr = nearestPointOnSegment(endpoint, other.a, other.b);
      if (pr.t > 0.02 && pr.t < 0.98 && pr.dist <= interiorSnapTol) {
        return true;
      }
    }

    return false;
  };

  for (let i = 0; i < state.tracks.length; i += 1) {
    const seg = state.tracks[i];
    if (!isEndpointConnected(i, seg.a)) {
      drawAtEndpoint(seg.a, seg.b, seg.color);
    }
    if (!isEndpointConnected(i, seg.b)) {
      drawAtEndpoint(seg.b, seg.a, seg.color);
    }
  }
}

function buildTrackSegment(start, end) {
  return {
    a: { x: start.x, y: start.y },
    b: { x: end.x, y: end.y },
    level: normalizeTrackLevel(state.settings.trackLevel),
    lineType: normalizeTrackLineType(state.settings.trackLineType),
    color: normalizeTrackColor(state.settings.trackColor)
  };
}

function getSelectedTrack() {
  if (!state.selection || state.selection.type !== 'track') {
    return null;
  }
  return state.tracks[state.selection.index] || null;
}

function syncTrackControlInputs() {
  const selectedTrack = getSelectedTrack();
  const level = selectedTrack ? normalizeTrackLevel(selectedTrack.level) : normalizeTrackLevel(state.settings.trackLevel);
  const lineType = selectedTrack ? normalizeTrackLineType(selectedTrack.lineType) : normalizeTrackLineType(state.settings.trackLineType);
  const color = selectedTrack ? normalizeTrackColor(selectedTrack.color) : normalizeTrackColor(state.settings.trackColor);

  if (trackLevelInput) {
    trackLevelInput.value = String(level);
  }
  if (trackLineTypeSelect) {
    trackLineTypeSelect.value = lineType;
  }
  if (trackColorInput) {
    trackColorInput.value = color;
  }
}

function applyTrackSettingsToSelection() {
  const seg = getSelectedTrack();
  if (!seg) {
    return false;
  }
  seg.level = normalizeTrackLevel(state.settings.trackLevel);
  seg.lineType = normalizeTrackLineType(state.settings.trackLineType);
  seg.color = normalizeTrackColor(state.settings.trackColor);
  return true;
}

function getPlatformSegments() {
  return state.platforms.filter((p) => p && p.a && p.b);
}

function getPlatformNodes() {
  const nodes = new Map();
  for (const seg of getPlatformSegments()) {
    nodes.set(platformNodeKey(seg.a), seg.a);
    nodes.set(platformNodeKey(seg.b), seg.b);
  }
  return Array.from(nodes.values());
}

function findNearestPlatformNode(point, snapStrength = 'normal') {
  const nodes = getPlatformNodes();
  if (nodes.length === 0) {
    return null;
  }

  const baseRadiusPx = snapStrength === 'light' ? 6 : 9;
  const snapRadiusWorld = clamp(baseRadiusPx / Math.max(0.0001, state.view.zoom), 0.2, 0.7);
  let best = null;
  for (const node of nodes) {
    const d = distance(point, node);
    if (d <= snapRadiusWorld && (!best || d < best.dist)) {
      best = { x: node.x, y: node.y, dist: d };
    }
  }
  return best;
}

function resolvePlatformPoint(rawPoint, startPoint, options = {}) {
  const { enableNodeSnap = true } = options;
  const constrained = applyTrackConstraint(rawPoint, startPoint);
  if (!enableNodeSnap) {
    return constrained;
  }

  const nearNode = findNearestPlatformNode(constrained, startPoint ? 'light' : 'normal');
  if (nearNode && (!startPoint || distance(startPoint, nearNode) > 0.0001)) {
    return { x: nearNode.x, y: nearNode.y };
  }
  return constrained;
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function buildPlatformFillPolygons(segments) {
  if (segments.length < 3) {
    return [];
  }

  const nodePoints = new Map();
  const adj = new Map();

  const addNeighbor = (from, to) => {
    if (!adj.has(from)) {
      adj.set(from, []);
    }
    adj.get(from).push(to);
  };

  for (const seg of segments) {
    const ka = platformNodeKey(seg.a);
    const kb = platformNodeKey(seg.b);
    nodePoints.set(ka, seg.a);
    nodePoints.set(kb, seg.b);
    addNeighbor(ka, kb);
    addNeighbor(kb, ka);
  }

  const degree2Nodes = Array.from(adj.keys()).filter((k) => (adj.get(k) || []).length === 2);
  const visited = new Set();
  const polygons = [];

  for (const start of degree2Nodes) {
    if (visited.has(start)) {
      continue;
    }

    let prev = null;
    let curr = start;
    const path = [];
    const seen = new Set();
    let closed = false;

    for (let guard = 0; guard < degree2Nodes.length + 2; guard += 1) {
      path.push(curr);
      seen.add(curr);

      const neighbors = adj.get(curr) || [];
      if (neighbors.length !== 2) {
        break;
      }

      const next = neighbors[0] === prev ? neighbors[1] : neighbors[0];
      prev = curr;
      curr = next;

      if (curr === start) {
        closed = path.length >= 3;
        break;
      }
      if (seen.has(curr)) {
        break;
      }
    }

    for (const key of path) {
      visited.add(key);
    }

    if (!closed) {
      continue;
    }

    const points = path.map((k) => nodePoints.get(k));
    if (points.length < 3) {
      continue;
    }

    const area = Math.abs(polygonArea(points));
    if (area < 0.4) {
      continue;
    }

    polygons.push(points);
  }

  return polygons;
}

function drawGrid() {
  const baseStep = state.settings.gridSize;
  const majorEvery = 5;

  // Keep dot spacing in a readable range across zoom levels.
  const minGapPx = 11;
  let minorStep = baseStep;
  while (minorStep * state.view.zoom < minGapPx) {
    minorStep *= 2;
  }
  const majorStep = minorStep * majorEvery;

  const worldMinX = -state.view.offsetX / state.view.zoom;
  const worldMaxX = (canvas.width - state.view.offsetX) / state.view.zoom;
  const worldMinY = -state.view.offsetY / state.view.zoom;
  const worldMaxY = (canvas.height - state.view.offsetY) / state.view.zoom;

  const startX = Math.floor(worldMinX / minorStep) * minorStep;
  const startY = Math.floor(worldMinY / minorStep) * minorStep;

  // Keep dot size stable in screen space so dots do not vanish when zoomed out.
  const minorRadiusPx = 0.95;
  const majorRadiusPx = 1.35;
  const minorRadius = minorRadiusPx / Math.max(0.0001, state.view.zoom);
  const majorRadius = majorRadiusPx / Math.max(0.0001, state.view.zoom);
  const majorStartX = Math.floor(worldMinX / majorStep) * majorStep;
  const majorStartY = Math.floor(worldMinY / majorStep) * majorStep;

  ctx.fillStyle = 'rgba(148, 148, 148, 0.74)';
  for (let x = startX; x <= worldMaxX + minorStep; x += minorStep) {
    for (let y = startY; y <= worldMaxY + minorStep; y += minorStep) {
      const onMajorX = Math.abs((x / majorStep) - Math.round(x / majorStep)) < 0.0001;
      const onMajorY = Math.abs((y / majorStep) - Math.round(y / majorStep)) < 0.0001;
      if (onMajorX && onMajorY) {
        continue;
      }
      ctx.beginPath();
      ctx.arc(x, y, minorRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Stronger dots every 5 steps for orientation at long zoom distances.
  ctx.fillStyle = 'rgba(108, 108, 108, 0.92)';
  for (let x = majorStartX; x <= worldMaxX + majorStep; x += majorStep) {
    for (let y = majorStartY; y <= worldMaxY + majorStep; y += majorStep) {
      ctx.beginPath();
      ctx.arc(x, y, majorRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTrackLengthOverlay() {
  if (state.mode !== 'track' || !state.draftingTrackStart || !state.mousePreview) {
    return;
  }

  const lengthDot = distance(state.draftingTrackStart, state.mousePreview);
  const minLen = state.settings.minTrackLength;
  const enough = lengthDot >= state.settings.minTrackLength;
  const label = `${lengthDot.toFixed(2)} ${UNIT_LABEL}`;

  const screen = worldToScreen(state.mousePreview);
  let x = screen.x + 14;
  let y = screen.y - 14;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = '12px "Yu Gothic UI"';

  const padX = 8;
  const boxH = 24;
  const textW = ctx.measureText(label).width;
  const boxW = textW + padX * 2;

  x = clamp(x, 6, canvas.width - boxW - 6);
  y = clamp(y, 28, canvas.height - boxH - 6);

  ctx.fillStyle = enough ? 'rgba(17, 24, 39, 0.86)' : 'rgba(127, 29, 29, 0.9)';
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = enough ? 'rgba(56, 189, 248, 0.88)' : 'rgba(252, 165, 165, 0.92)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1);

  ctx.fillStyle = '#f8fafc';
  ctx.fillText(label, x + padX, y + 16);

  // Show the minimum target for easier snapping to required length.
  ctx.fillStyle = enough ? 'rgba(191, 219, 254, 0.9)' : 'rgba(254, 202, 202, 0.95)';
  ctx.font = '10px "Yu Gothic UI"';
  ctx.fillText(`min ${minLen.toFixed(1)} ${UNIT_LABEL}`, x + padX, y - 4);
  ctx.restore();
}

function drawTracks() {
  const trackWorldWidth = getTrackWorldWidth();
  const nodeCounts = collectTrackNodeCounts();

  ctx.lineWidth = trackWorldWidth;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = TRACK_BODY_ALPHA;
  for (const seg of state.tracks) {
    applyTrackLineStyle(seg);
    ctx.beginPath();
    ctx.moveTo(seg.a.x, seg.a.y);
    ctx.lineTo(seg.b.x, seg.b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Keep rounded appearance at branch/connection nodes only.
  const joinRadius = trackWorldWidth * 0.51;
  ctx.globalAlpha = TRACK_BODY_ALPHA;
  for (const seg of state.tracks) {
    ctx.fillStyle = normalizeTrackColor(seg.color);
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
  ctx.globalAlpha = 1;

  drawLevelCrossingHints();
  drawDeadEndMarkers(nodeCounts);

  if (state.mode === 'track' && state.draftingTrackStart) {
    const previewEnd = state.mousePreview?.x !== undefined
      ? state.mousePreview
      : state.draftingTrackStart;
    const previewSeg = {
      a: state.draftingTrackStart,
      b: previewEnd,
      lineType: state.settings.trackLineType,
      color: state.settings.trackColor
    };

    ctx.lineWidth = trackWorldWidth;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    applyTrackLineStyle(previewSeg);
    ctx.beginPath();
    ctx.moveTo(state.draftingTrackStart.x, state.draftingTrackStart.y);
    ctx.lineTo(previewEnd.x, previewEnd.y);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  if (state.mode === 'track' && state.mousePreview) {
    const p = state.mousePreview;
    const hasStart = Boolean(state.draftingTrackStart);
    const ringLineWidth = clamp(1.6 / state.view.zoom, 0.14, 0.5);
    // Match cursor ring outer edge to clearance: total 6u => radius 3u.
    const ringRadius = Math.max(0.05, CLEARANCE_HALF_WIDTH_DOT - ringLineWidth / 2);
    const innerRadius = hasStart ? 0.28 : 0.34;

    // Cursor-following pick marker for the next click position.
    ctx.strokeStyle = hasStart ? 'rgba(22, 138, 206, 0.95)' : 'rgba(23, 116, 182, 0.95)';
    ctx.lineWidth = ringLineWidth;
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
      const selectedWorldWidth = (Math.max(state.settings.trackWidth * state.view.zoom, 2.8) + 1.8) / state.view.zoom;
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
  const platformWorldWidth = getPlatformWorldWidth();
  const platformSegments = getPlatformSegments();
  const platformPolygons = buildPlatformFillPolygons(platformSegments);

  // Fill enclosed platform areas when segment loops form a polygon.
  ctx.fillStyle = 'rgba(138, 138, 138, 0.34)';
  for (const poly of platformPolygons) {
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }

  for (const p of state.platforms) {
    if (p.a && p.b) {
      ctx.strokeStyle = '#8a8a8a';
      ctx.lineWidth = platformWorldWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p.a.x, p.a.y);
      ctx.lineTo(p.b.x, p.b.y);
      ctx.stroke();
      continue;
    }

    // Legacy rectangular platform compatibility.
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  if (state.mode === 'platform' && state.draftingPlatformStart && state.draftingPlatformCurrent) {
    ctx.strokeStyle = 'rgba(138, 138, 138, 0.75)';
    ctx.lineWidth = platformWorldWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash([0.3, 0.25]);
    ctx.beginPath();
    ctx.moveTo(state.draftingPlatformStart.x, state.draftingPlatformStart.y);
    ctx.lineTo(state.draftingPlatformCurrent.x, state.draftingPlatformCurrent.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (state.mode === 'platform' && state.mousePreview) {
    const p = state.mousePreview;
    const hasStart = Boolean(state.draftingPlatformStart);
    const ringLineWidth = clamp(1.5 / state.view.zoom, 0.14, 0.48);
    const ringRadius = hasStart ? 0.56 : 0.62;
    const innerRadius = hasStart ? 0.16 : 0.2;

    ctx.strokeStyle = hasStart ? 'rgba(125, 125, 125, 0.96)' : 'rgba(108, 108, 108, 0.95)';
    ctx.lineWidth = ringLineWidth;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = hasStart ? 'rgba(156, 156, 156, 0.95)' : 'rgba(130, 130, 130, 0.92)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, innerRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.selection && state.selection.type === 'platform') {
    const p = state.platforms[state.selection.index];
    if (p) {
      ctx.strokeStyle = 'rgba(10, 130, 220, 0.95)';
      ctx.lineWidth = Math.max(platformWorldWidth + 0.24, 0.24);
      ctx.setLineDash([0.6, 0.4]);
      if (p.a && p.b) {
        ctx.beginPath();
        ctx.moveTo(p.a.x, p.a.y);
        ctx.lineTo(p.b.x, p.b.y);
        ctx.stroke();
      } else {
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }
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
  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  drawTrackLengthOverlay();
  syncTrackControlInputs();
  updateStatusBar();
}

function updateStatusBar() {
  if (zoomStat) {
    const relativeZoom = ((state.view.zoom / ZOOM_BASELINE) - 1) * 100;
    const rounded = Math.round(relativeZoom);
    const sign = rounded > 0 ? '+' : '';
    zoomStat.textContent = `${sign}${rounded}%`;
  }
  if (countStat) {
    countStat.textContent = `T${state.tracks.length} P${state.platforms.length} R${state.trains.length}`;
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
    if (p.a && p.b) {
      const pr = nearestPointOnSegment(point, p.a, p.b);
      if (pr.dist < PLATFORM_INTERACT_RADIUS_DOT) {
        state.platforms.splice(i, 1);
        return true;
      }
      continue;
    }

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
  let best = null;
  const pushCandidate = (type, index, dist, radius) => {
    if (dist > radius) {
      return;
    }
    const score = dist / Math.max(radius, 0.0001);
    const priority = type === 'track' ? 0 : type === 'platform' ? 1 : 2;
    if (!best || score < best.score || (Math.abs(score - best.score) < 1e-6 && priority < best.priority)) {
      best = { type, index, score, priority };
    }
  };

  for (let i = 0; i < state.trains.length; i += 1) {
    const tr = state.trains[i];
    pushCandidate('train', i, distance(point, tr), 2.4);
  }

  for (let i = 0; i < state.platforms.length; i += 1) {
    const p = state.platforms[i];
    if (p.a && p.b) {
      const pr = nearestPointOnSegment(point, p.a, p.b);
      pushCandidate('platform', i, pr.dist, PLATFORM_INTERACT_RADIUS_DOT);
      continue;
    }

    const dx = point.x < p.x ? p.x - point.x : point.x > (p.x + p.w) ? point.x - (p.x + p.w) : 0;
    const dy = point.y < p.y ? p.y - point.y : point.y > (p.y + p.h) ? point.y - (p.y + p.h) : 0;
    pushCandidate('platform', i, Math.hypot(dx, dy), PLATFORM_INTERACT_RADIUS_DOT);
  }

  // Track picks are based on centerline nearest distance.
  const trackPickRadius = clamp(7 / Math.max(0.0001, state.view.zoom), 0.18, 0.8);
  for (let i = 0; i < state.tracks.length; i += 1) {
    const seg = state.tracks[i];
    const pr = nearestPointOnSegment(point, seg.a, seg.b);
    pushCandidate('track', i, pr.dist, trackPickRadius);
  }

  if (!best) {
    return null;
  }
  return { type: best.type, index: best.index };
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
    if (p.a && p.b) {
      p.a.x += dx;
      p.a.y += dy;
      p.b.x += dx;
      p.b.y += dy;
    } else {
      p.x += dx;
      p.y += dy;
    }
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

  let deleted = false;

  if (state.selection.type === 'track') {
    state.tracks.splice(state.selection.index, 1);
    deleted = true;
  }
  if (state.selection.type === 'platform') {
    state.platforms.splice(state.selection.index, 1);
    deleted = true;
  }
  if (state.selection.type === 'train') {
    state.trains.splice(state.selection.index, 1);
    deleted = true;
  }
  state.selection = null;

  if (deleted) {
    commitHistory();
  }
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
  requestRender();
}, { passive: false });

canvas.addEventListener('mousemove', (ev) => {
  const screen = toCanvasScreenPoint(ev);

  if (state.view.panning && state.view.panLastScreen) {
    const dx = screen.x - state.view.panLastScreen.x;
    const dy = screen.y - state.view.panLastScreen.y;
    state.view.offsetX += dx;
    state.view.offsetY += dy;
    state.view.panLastScreen = screen;
    requestRender();
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
      state.selectionMoved = true;
      requestRender();
    }
    return;
  }

  const p = state.mode === 'track'
    ? resolveTrackPoint(raw, state.draftingTrackStart, { enableNodeSnap: !ev.altKey })
    : state.mode === 'platform'
      ? resolvePlatformPoint(raw, state.draftingPlatformStart, { enableNodeSnap: !ev.altKey })
      : quantizePoint(raw);
  state.mousePreview = p;
  if (state.mode === 'platform' && state.draftingPlatformStart) {
    state.draftingPlatformCurrent = p;
  }
  requestRender();
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
      state.selectionMoved = false;
      state.lastDragWorld = state.settings.snap ? p : raw;
    } else {
      state.draggingSelection = false;
      state.selectionMoved = false;
      state.lastDragWorld = null;
    }
    render();
    return;
  }

  const p = state.mode === 'track'
    ? resolveTrackPoint(raw, state.draftingTrackStart, { enableNodeSnap: !ev.altKey })
    : state.mode === 'platform'
      ? resolvePlatformPoint(raw, state.draftingPlatformStart, { enableNodeSnap: !ev.altKey })
      : quantizePoint(raw);

  if (state.mode === 'track') {
    if (!state.draftingTrackStart) {
      state.draftingTrackStart = p;
    } else {
      const minTrackLength = Math.max(1, Number(state.settings.minTrackLength) || 1);
      if (distance(state.draftingTrackStart, p) >= minTrackLength) {
        state.tracks.push(buildTrackSegment(state.draftingTrackStart, p));
        commitHistory();
      }
      state.draftingTrackStart = null;
    }
    render();
    return;
  }

  if (state.mode === 'platform') {
    if (!state.draftingPlatformStart) {
      state.draftingPlatformStart = p;
      state.draftingPlatformCurrent = p;
    } else {
      if (distance(state.draftingPlatformStart, p) >= PLATFORM_MIN_LENGTH_DOT) {
        state.platforms.push({
          a: { x: state.draftingPlatformStart.x, y: state.draftingPlatformStart.y },
          b: { x: p.x, y: p.y }
        });
        commitHistory();
      }
      // Continue drawing from the last endpoint for chained platform segments.
      state.draftingPlatformStart = p;
      state.draftingPlatformCurrent = p;
    }
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
      commitHistory();
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
      commitHistory();
      render();
    }
    return;
  }

  if (state.mode === 'erase') {
    if (eraseAt(raw)) {
      commitHistory();
      render();
    }
  }
});

canvas.addEventListener('mouseup', () => {
  if (state.view.panning) {
    state.view.panning = false;
    state.view.panLastScreen = null;
    return;
  }

  if (state.mode === 'select' && state.draggingSelection) {
    if (state.selectionMoved) {
      commitHistory();
    }
    state.draggingSelection = false;
    state.selectionMoved = false;
    state.lastDragWorld = null;
    return;
  }

  // Platform is now click-to-draw; no mouseup finalize action is needed.
});

clearBtn.addEventListener('click', () => {
  if (state.tracks.length === 0 && state.platforms.length === 0 && state.trains.length === 0) {
    return;
  }
  clearAllData();
  commitHistory();
  render();
});

quickSaveBtn.addEventListener('click', () => {
  quickSaveToLocal();
});

saveBtn.addEventListener('click', () => {
  saveDiagramToFile();
});

loadBtn.addEventListener('click', () => {
  loadFileInput.click();
});

loadFileInput.addEventListener('change', () => {
  const file = loadFileInput.files && loadFileInput.files[0];
  if (file) {
    loadDiagramFromFile(file, {
      onSuccess: () => {
        if (titleFileLoadPending) {
          titleFileLoadPending = false;
          hideTitleAndEnterEditor();
        }
      }
    });
  }
  titleFileLoadPending = false;
  loadFileInput.value = '';
});

if (titleNewGameBtn) {
  titleNewGameBtn.addEventListener('click', () => {
    startNewGame();
  });
}

if (titleLoadGameBtn) {
  titleLoadGameBtn.addEventListener('click', () => {
    titleFileLoadPending = true;
    setTitleInfo('セーブデータを選択してください。選択後すぐ読み込みます。');
    loadFileInput.click();
  });
}

if (titleContinueBtn) {
  titleContinueBtn.addEventListener('click', () => {
    if (restoreLastSelectedSaveFromLocal() || restoreQuickSaveFromLocal()) {
      hideTitleAndEnterEditor();
      setTitleInfo('');
      return;
    }
    setTitleInfo('前回データが見つかりません。先にセーブデータを選択してください。', true);
  });
}

if (titleExitBtn) {
  titleExitBtn.addEventListener('click', () => {
    window.close();
  });
}

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

for (const btn of modeButtons) {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
}

function refreshSettingLabels() {
  trackWidthLabel.textContent = `${Math.round(state.settings.trackWidth)}${UNIT_LABEL}`;
  minTrackLenLabel.textContent = `${state.settings.minTrackLength.toFixed(1)}${UNIT_LABEL}`;
  syncTrackControlInputs();
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

trackLevelInput.addEventListener('input', () => {
  state.settings.trackLevel = normalizeTrackLevel(trackLevelInput.value);
  if (applyTrackSettingsToSelection()) {
    render();
  }
});

trackLevelInput.addEventListener('change', () => {
  if (applyTrackSettingsToSelection()) {
    commitHistory();
    render();
  }
});

trackLineTypeSelect.addEventListener('change', () => {
  state.settings.trackLineType = normalizeTrackLineType(trackLineTypeSelect.value);
  if (applyTrackSettingsToSelection()) {
    commitHistory();
  }
  render();
});

trackColorInput.addEventListener('input', () => {
  state.settings.trackColor = normalizeTrackColor(trackColorInput.value);
  if (applyTrackSettingsToSelection()) {
    render();
  }
});

trackColorInput.addEventListener('change', () => {
  if (applyTrackSettingsToSelection()) {
    commitHistory();
    render();
  }
});

minTrackLenRange.addEventListener('input', () => {
  state.settings.minTrackLength = Number(minTrackLenRange.value);
  refreshSettingLabels();
});

window.addEventListener('keydown', (ev) => {
  if (isTitleVisible()) {
    return;
  }

  const mod = ev.ctrlKey || ev.metaKey;
  const key = ev.key.toLowerCase();

  if (mod && !ev.altKey && key === 'z' && !ev.shiftKey) {
    ev.preventDefault();
    undo();
    return;
  }

  if (mod && !ev.altKey && (key === 'y' || (key === 'z' && ev.shiftKey))) {
      if (mod && !ev.altKey && key === 's') {
        ev.preventDefault();
        quickSaveToLocal();
        return;
      }

    ev.preventDefault();
    redo();
    return;
  }

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
resetViewToDefault();
commitHistory();
refreshSettingLabels();
render();
if (titleScreen) {
  titleScreen.hidden = false;
  showTitleMain();
}
