const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const topbar = document.querySelector('.topbar');

const modeSelect = document.getElementById('modeSelect');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const playBtn = document.getElementById('playBtn');
const speedRange = document.getElementById('speedRange');
const speedLabel = document.getElementById('speedLabel');
const minRadiusRange = document.getElementById('minRadiusRange');
const minRadiusLabel = document.getElementById('minRadiusLabel');
const trackPresetSelect = document.getElementById('trackPresetSelect');
const renderModeSelect = document.getElementById('renderModeSelect');
const layerGrid = document.getElementById('layerGrid');
const layerTrack = document.getElementById('layerTrack');
const layerStations = document.getElementById('layerStations');
const layerTrains = document.getElementById('layerTrains');
const layerDimensions = document.getElementById('layerDimensions');
const layerCurveInfo = document.getElementById('layerCurveInfo');
const layerWarnings = document.getElementById('layerWarnings');
const resetBtn = document.getElementById('resetBtn');
const hintText = document.getElementById('hintText');
const selectFilterMenu = document.getElementById('selectFilterMenu');
const filterStation = document.getElementById('filterStation');
const filterSignal = document.getElementById('filterSignal');
const filterObject = document.getElementById('filterObject');
const filterTrain = document.getElementById('filterTrain');
const partPaletteMenu = document.getElementById('partPaletteMenu');
const partTypeSelect = document.getElementById('partTypeSelect');
const curveTurnSelect = document.getElementById('curveTurnSelect');
const resetPartAnchorBtn = document.getElementById('resetPartAnchorBtn');
const stationList = document.getElementById('stationList');
const trainForm = document.getElementById('trainForm');
const trainNameInput = document.getElementById('trainName');
const trainStopsInput = document.getElementById('trainStops');
const trainList = document.getElementById('trainList');
const STORAGE_KEY = 'transitnexus.project.v1';

const TRACK_PRESETS = {
  ballast_main: {
    ballastOuter: '#2f3438',
    ballastMid: '#4a4f54',
    ballastInner: '#666b71',
    ballastWidth: 8.2,
    railBaseColor: '#a7afb7',
    railHighlightColor: '#d8dee4',
    railWidth: 1.25,
    railGap: 2.7,
    sleeperColor: '#5a4334',
    sleeperWidth: 14.8,
    sleeperThickness: 1.05,
    sleeperStep: 4.3,
    sleeperStepCurveFactor: 0.14
  },
  slab_urban: {
    ballastOuter: '#5a646f',
    ballastMid: '#757f8a',
    ballastInner: '#8b959f',
    ballastWidth: 7.4,
    railBaseColor: '#a9b7c4',
    railHighlightColor: '#e3ecf4',
    railWidth: 1.15,
    railGap: 2.55,
    sleeperColor: '#8e98a2',
    sleeperWidth: 14.2,
    sleeperThickness: 0.95,
    sleeperStep: 4.6,
    sleeperStepCurveFactor: 0.1
  },
  yard_light: {
    ballastOuter: '#314751',
    ballastMid: '#3f5a66',
    ballastInner: '#4f6a77',
    ballastWidth: 6.8,
    railBaseColor: '#a2b3bf',
    railHighlightColor: '#d0dde8',
    railWidth: 1.05,
    railGap: 2.35,
    sleeperColor: '#5f4738',
    sleeperWidth: 14.6,
    sleeperThickness: 0.95,
    sleeperStep: 4.1,
    sleeperStepCurveFactor: 0.16
  }
};

// CAD mode uses JR narrow gauge-inspired parameters in N-gauge drawing scale.
const JR_NARROW_GAUGE_CAD = {
  prototypeGaugeMm: 1067,
  prototypeSleeperSpacingMinMm: 600,
  prototypeSleeperSpacingMaxMm: 700,
  prototypeSleeperLengthMinMm: 2100,
  prototypeSleeperLengthMaxMm: 2400,
  modelScale: 150,
  modelGaugeMm: 9.0,
  railWidthMm: 0.95,
  sleeperLengthMm: 14.8,
  sleeperSpacingMm: 4.3,
  sleeperCurveDenseFactor: 0.18,
  sleeperLineMm: 0.72
};

const PART_LIBRARY = {
  straight_124: {
    type: 'straight',
    name: 'Straight 124',
    length: 124
  },
  curve_r140_45: {
    type: 'curve',
    name: 'Curve R140 45',
    radius: 140,
    angleDeg: 45
  },
  curve_r280_45: {
    type: 'curve',
    name: 'Curve R280 45',
    radius: 280,
    angleDeg: 45
  }
};

const TRACK_CONNECTION_RULES = {
  snapDistance: 18,
  minSegmentLength: 6,
  maxInitialDeflectionDeg: 70,
  endpointEpsilon: 0.8
};

const state = {
  mode: 'track',
  isRunning: false,
  simMinute: 360,
  simSpeed: 8,
  rules: {
    minRadius: 140,
    trackPreset: 'ballast_main',
    renderMode: 'cad',
    showDimensions: true,
    layers: {
      grid: true,
      track: true,
      stations: true,
      trains: true,
      dimensions: true,
      curveInfo: true,
      warnings: true
    }
  },
  view: {
    zoom: 1,
    minZoom: 0.35,
    maxZoom: 3.5,
    offsetX: 0,
    offsetY: 0,
    panning: false,
    panLast: null,
    panDistance: 0,
    justPanned: false
  },
  trackPoints: [],
  trackParts: [],
  stations: [],
  trains: [],
  buildingTrack: [],
  draftConstraintHeadingRad: null,
  trackPreviewPoint: null,
  selectedStationIds: new Set(),
  selectedTrainIds: new Set(),
  selectionFilters: {
    station: true,
    signal: false,
    object: false,
    train: true
  },
  selection: {
    active: false,
    start: null,
    current: null,
    append: false
  },
  history: [],
  future: [],
  partBuilder: {
    partType: 'straight_124',
    curveTurn: 'left',
    anchor: null,
    headingRad: 0,
    preview: null
  },
  diagnostics: {
    sharpCurveIndices: []
  }
};

let hintTimerId = null;

state.mode = modeSelect.value || state.mode;

function resizeCanvasToViewport() {
  const rect = canvas.getBoundingClientRect();
  const nextWidth = Math.max(1, Math.floor(rect.width));
  const nextHeight = Math.max(1, Math.floor(rect.height));

  if (canvas.width === nextWidth && canvas.height === nextHeight) {
    return;
  }

  canvas.width = nextWidth;
  canvas.height = nextHeight;
  render();
}

function updateHudLayoutMetrics() {
  if (!topbar) {
    return;
  }

  const rect = topbar.getBoundingClientRect();
  const nextHudTop = Math.ceil(rect.bottom + 10);
  document.documentElement.style.setProperty('--hud-top', `${nextHudTop}px`);
}

function syncSelectionFilterMenu() {
  if (!selectFilterMenu) {
    return;
  }
  selectFilterMenu.classList.toggle('visible', state.mode === 'select');
}

function syncPartPaletteMenu() {
  if (!partPaletteMenu) {
    return;
  }
  partPaletteMenu.classList.toggle('visible', state.mode === 'part');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function snapshotState() {
  return {
    simMinute: state.simMinute,
    rules: clone(state.rules),
    trackPoints: clone(state.trackPoints),
    trackParts: clone(state.trackParts),
    stations: clone(state.stations),
    trains: clone(state.trains),
    buildingTrack: clone(state.buildingTrack),
    partBuilder: clone({
      partType: state.partBuilder.partType,
      curveTurn: state.partBuilder.curveTurn,
      anchor: state.partBuilder.anchor,
      headingRad: state.partBuilder.headingRad
    })
  };
}

function snapshotsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function updateUndoRedoButtons() {
  undoBtn.disabled = state.history.length <= 1;
  redoBtn.disabled = state.future.length === 0;
}

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
  updateUndoRedoButtons();
}

function restoreSnapshot(snap) {
  state.simMinute = snap.simMinute;
  state.rules = {
    minRadius: 140,
    trackPreset: 'ballast_main',
    renderMode: 'cad',
    showDimensions: true,
    layers: {
      grid: true,
      track: true,
      stations: true,
      trains: true,
      dimensions: true,
      curveInfo: true,
      warnings: true
    },
    ...(snap.rules || {})
  };
  state.rules.layers = {
    grid: true,
    track: true,
    stations: true,
    trains: true,
    dimensions: true,
    curveInfo: true,
    warnings: true,
    ...(state.rules.layers || {})
  };
  state.rules.showDimensions = state.rules.layers.dimensions;
  state.trackPoints = clone(snap.trackPoints);
  state.trackParts = clone(snap.trackParts || []);
  state.stations = clone(snap.stations);
  state.trains = clone(snap.trains);
  state.buildingTrack = clone(snap.buildingTrack);
  state.draftConstraintHeadingRad = null;
  const pb = snap.partBuilder || {};
  state.partBuilder.partType = pb.partType || 'straight_124';
  state.partBuilder.curveTurn = pb.curveTurn || 'left';
  state.partBuilder.anchor = pb.anchor || null;
  state.partBuilder.headingRad = Number.isFinite(pb.headingRad) ? pb.headingRad : 0;
  state.partBuilder.preview = null;
  state.trackPreviewPoint = null;
  state.selectedStationIds.clear();
  state.selectedTrainIds.clear();
  state.selection.active = false;
  state.selection.start = null;
  state.selection.current = null;
  state.selection.append = false;
  rebuildStationList();
  rebuildTrainList();
  minRadiusRange.value = String(state.rules.minRadius);
  minRadiusLabel.textContent = `R>=${state.rules.minRadius}`;
  trackPresetSelect.value = state.rules.trackPreset;
  renderModeSelect.value = state.rules.renderMode;
  layerGrid.checked = state.rules.layers.grid;
  layerTrack.checked = state.rules.layers.track;
  layerStations.checked = state.rules.layers.stations;
  layerTrains.checked = state.rules.layers.trains;
  layerDimensions.checked = state.rules.layers.dimensions;
  layerCurveInfo.checked = state.rules.layers.curveInfo;
  layerWarnings.checked = state.rules.layers.warnings;
  partTypeSelect.value = state.partBuilder.partType;
  curveTurnSelect.value = state.partBuilder.curveTurn;
  updateTrackDiagnostics();
  updateTrains();
  render();
}

function setHintTemporary(text, ms = 1800) {
  if (hintTimerId) {
    clearTimeout(hintTimerId);
  }
  hintText.textContent = text;
  hintTimerId = setTimeout(() => {
    hintTimerId = null;
    updateHint();
  }, ms);
}

function saveProjectToLocal() {
  const payload = {
    savedAt: new Date().toISOString(),
    snapshot: snapshotState()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadProjectFromLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return false;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return false;
  }

  if (!data || !data.snapshot) {
    return false;
  }

  restoreSnapshot(data.snapshot);
  state.history = [snapshotState()];
  state.future = [];
  updateUndoRedoButtons();
  return true;
}

function undo() {
  if (state.history.length <= 1) {
    return;
  }

  const current = state.history.pop();
  state.future.push(current);
  const prev = state.history[state.history.length - 1];
  restoreSnapshot(prev);
  updateUndoRedoButtons();
}

function redo() {
  if (state.future.length === 0) {
    return;
  }

  const next = state.future.pop();
  state.history.push(next);
  restoreSnapshot(next);
  updateUndoRedoButtons();
}

function toCanvasPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  const sx = ((ev.clientX - rect.left) / rect.width) * canvas.width;
  const sy = ((ev.clientY - rect.top) / rect.height) * canvas.height;
  return {
    x: (sx - state.view.offsetX) / state.view.zoom,
    y: (sy - state.view.offsetY) / state.view.zoom
  };
}

function toCanvasScreenPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * canvas.width,
    y: ((ev.clientY - rect.top) / rect.height) * canvas.height
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRect(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y)
  };
}

function clearSelection() {
  state.selectedStationIds.clear();
  state.selectedTrainIds.clear();
}

function pickEntityAt(point, radius = 12) {
  let best = null;

  if (state.selectionFilters.station) {
    for (const st of state.stations) {
      const d = distance(point, st);
      if (d <= radius && (!best || d < best.dist)) {
        best = { type: 'station', id: st.id, dist: d };
      }
    }
  }

  if (state.selectionFilters.train) {
    for (const tr of state.trains) {
      const p = pointAtS(tr.activeS);
      if (!p) {
        continue;
      }
      const d = distance(point, p);
      if (d <= radius && (!best || d < best.dist)) {
        best = { type: 'train', id: tr.id, dist: d };
      }
    }
  }

  return best;
}

function selectByClick(point, mode = 'replace') {
  const picked = pickEntityAt(point);
  if (mode === 'replace') {
    clearSelection();
  }

  if (picked) {
    const isToggle = mode === 'toggle';

    if (picked.type === 'station') {
      if (isToggle && state.selectedStationIds.has(picked.id)) {
        state.selectedStationIds.delete(picked.id);
      } else {
        state.selectedStationIds.add(picked.id);
      }
    }
    if (picked.type === 'train') {
      if (isToggle && state.selectedTrainIds.has(picked.id)) {
        state.selectedTrainIds.delete(picked.id);
      } else {
        state.selectedTrainIds.add(picked.id);
      }
    }
  }

  rebuildStationList();
  rebuildTrainList();
  render();
}

function nextStationName() {
  let n = 1;
  while (state.stations.some((s) => s.name === `S${n}`)) {
    n += 1;
  }
  return `S${n}`;
}

function deleteSelectedEntities() {
  if (state.selectedStationIds.size === 0 && state.selectedTrainIds.size === 0) {
    return;
  }

  const removedNames = new Set(
    state.stations.filter((s) => state.selectedStationIds.has(s.id)).map((s) => s.name)
  );

  state.stations = state.stations.filter((s) => !state.selectedStationIds.has(s.id));
  state.trains = state.trains.filter((t) => {
    if (state.selectedTrainIds.has(t.id)) {
      return false;
    }
    return t.stops.every((stop) => !removedNames.has(stop.stationName));
  });
  clearSelection();
  rebuildStationList();
  rebuildTrainList();
  updateTrains();
  commitHistory();
  render();
}

function cancelTrackBuilding() {
  if (state.mode !== 'track' || state.buildingTrack.length === 0) {
    return false;
  }

  state.buildingTrack = [];
  state.draftConstraintHeadingRad = null;
  state.trackPreviewPoint = null;
  commitHistory();
  render();
  return true;
}

function resetPartAnchor() {
  state.partBuilder.anchor = null;
  state.partBuilder.preview = null;
  render();
}

function anchorFromTrackEnd() {
  if (state.trackPoints.length < 2) {
    return null;
  }
  const a = state.trackPoints[state.trackPoints.length - 2];
  const b = state.trackPoints[state.trackPoints.length - 1];
  const headingRad = Math.atan2(b.y - a.y, b.x - a.x);
  return {
    x: b.x,
    y: b.y,
    headingRad
  };
}

function samplePartGeometry(anchor, headingRad, partType, curveTurn) {
  const part = PART_LIBRARY[partType] || PART_LIBRARY.straight_124;
  if (!anchor) {
    return null;
  }

  if (part.type === 'straight') {
    const end = {
      x: anchor.x + Math.cos(headingRad) * part.length,
      y: anchor.y + Math.sin(headingRad) * part.length
    };
    return {
      partType,
      curveTurn,
      start: { x: anchor.x, y: anchor.y },
      end,
      headingStart: headingRad,
      headingEnd: headingRad,
      polyline: [
        { x: anchor.x, y: anchor.y },
        end
      ]
    };
  }

  const sign = curveTurn === 'right' ? -1 : 1;
  const radius = part.radius;
  const arc = (part.angleDeg * Math.PI) / 180;
  const normal = {
    x: -Math.sin(headingRad) * sign,
    y: Math.cos(headingRad) * sign
  };

  const center = {
    x: anchor.x + normal.x * radius,
    y: anchor.y + normal.y * radius
  };
  const startRad = Math.atan2(anchor.y - center.y, anchor.x - center.x);
  const endRad = startRad + sign * arc;
  const end = {
    x: center.x + Math.cos(endRad) * radius,
    y: center.y + Math.sin(endRad) * radius
  };

  const steps = Math.max(8, Math.ceil(part.angleDeg / 5));
  const polyline = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const th = startRad + sign * arc * t;
    polyline.push({
      x: center.x + Math.cos(th) * radius,
      y: center.y + Math.sin(th) * radius
    });
  }

  return {
    partType,
    curveTurn,
    start: { x: anchor.x, y: anchor.y },
    end,
    headingStart: headingRad,
    headingEnd: headingRad + sign * arc,
    polyline
  };
}

function appendPolylineToTrack(polyline) {
  if (!polyline || polyline.length < 2) {
    return;
  }

  if (state.trackPoints.length === 0) {
    state.trackPoints.push(...polyline);
    return;
  }

  const last = state.trackPoints[state.trackPoints.length - 1];
  const first = polyline[0];
  const near = distance(last, first) < 0.01;
  if (near) {
    state.trackPoints.push(...polyline.slice(1));
  } else {
    state.trackPoints.push(...polyline);
  }
}

function commitPartPlacement(partGeom) {
  if (!partGeom) {
    return;
  }

  state.trackParts.push({
    id: crypto.randomUUID(),
    partType: partGeom.partType,
    curveTurn: partGeom.curveTurn,
    start: partGeom.start,
    end: partGeom.end,
    headingStart: partGeom.headingStart,
    headingEnd: partGeom.headingEnd
  });
  appendPolylineToTrack(partGeom.polyline);

  state.partBuilder.anchor = {
    x: partGeom.end.x,
    y: partGeom.end.y
  };
  state.partBuilder.headingRad = partGeom.headingEnd;
  state.partBuilder.preview = null;

  updateTrackDiagnostics();
  commitHistory();
  render();
}

function commitTrackDraft() {
  if (state.mode !== 'track' || state.buildingTrack.length < 2) {
    return false;
  }

  if (state.trackPoints.length === 0) {
    state.trackPoints = [...state.buildingTrack];
  } else {
    const merged = [...state.trackPoints, ...state.buildingTrack];
    state.trackPoints = merged;
  }

  state.buildingTrack = [];
  state.draftConstraintHeadingRad = null;
  state.trackPreviewPoint = null;
  updateTrackDiagnostics();
  commitHistory();
  render();
  return true;
}

function fmtTime(minuteFloat) {
  const total = Math.max(0, Math.floor(minuteFloat));
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function parseTime(hhmm) {
  const [hh, mm] = hhmm.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) {
    return null;
  }
  return hh * 60 + mm;
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function angleDiffAbs(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function pointsNear(a, b, eps = TRACK_CONNECTION_RULES.endpointEpsilon) {
  return distance(a, b) <= eps;
}

function getTrackEndpointTargets() {
  const pts = state.trackPoints;
  if (pts.length < 2) {
    return [];
  }

  const first = pts[0];
  const second = pts[1];
  const prev = pts[pts.length - 2];
  const last = pts[pts.length - 1];

  return [
    {
      point: { x: first.x, y: first.y },
      headingRad: Math.atan2(first.y - second.y, first.x - second.x)
    },
    {
      point: { x: last.x, y: last.y },
      headingRad: Math.atan2(last.y - prev.y, last.x - prev.x)
    }
  ];
}

function snapToTrackEndpoint(point) {
  const targets = getTrackEndpointTargets();
  let best = null;
  for (const t of targets) {
    const d = distance(point, t.point);
    if (d <= TRACK_CONNECTION_RULES.snapDistance && (!best || d < best.dist)) {
      best = { ...t, dist: d };
    }
  }
  return best;
}

function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function isIllegalIntersection(a, b) {
  const pts = state.trackPoints;
  for (let i = 1; i < pts.length; i += 1) {
    const c = pts[i - 1];
    const d = pts[i];

    if (pointsNear(a, c) || pointsNear(a, d) || pointsNear(b, c) || pointsNear(b, d)) {
      continue;
    }

    if (segmentsIntersect(a, b, c, d)) {
      return true;
    }
  }

  const draft = state.buildingTrack;
  for (let i = 1; i < draft.length - 1; i += 1) {
    const c = draft[i - 1];
    const d = draft[i];
    if (pointsNear(a, c) || pointsNear(a, d) || pointsNear(b, c) || pointsNear(b, d)) {
      continue;
    }
    if (segmentsIntersect(a, b, c, d)) {
      return true;
    }
  }

  return false;
}

function circumcircleRadius(a, b, c) {
  const ab = distance(a, b);
  const bc = distance(b, c);
  const ca = distance(c, a);

  const area2 = Math.abs(
    a.x * (b.y - c.y) +
    b.x * (c.y - a.y) +
    c.x * (a.y - b.y)
  );

  if (area2 < 0.0001) {
    return Number.POSITIVE_INFINITY;
  }

  return (ab * bc * ca) / (2 * area2);
}

function updateTrackDiagnostics() {
  const pts = state.trackPoints;
  const bad = [];
  if (pts.length < 3) {
    state.diagnostics.sharpCurveIndices = bad;
    return;
  }

  for (let i = 1; i < pts.length - 1; i += 1) {
    const radius = circumcircleRadius(pts[i - 1], pts[i], pts[i + 1]);
    if (radius < state.rules.minRadius) {
      bad.push(i);
    }
  }

  state.diagnostics.sharpCurveIndices = bad;
}

function nearestPointOnSegment(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) {
    return { x: a.x, y: a.y, t: 0, dist: distance(p, a) };
  }

  const apx = p.x - a.x;
  const apy = p.y - a.y;
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));

  const proj = { x: a.x + abx * t, y: a.y + aby * t };
  return { x: proj.x, y: proj.y, t, dist: distance(p, proj) };
}

function computeTrackChain() {
  const pts = state.trackPoints;
  const chain = [];
  let acc = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const segLen = distance(pts[i - 1], pts[i]);
    chain.push({
      from: pts[i - 1],
      to: pts[i],
      len: segLen,
      startS: acc,
      endS: acc + segLen
    });
    acc += segLen;
  }
  return { chain, totalLen: acc };
}

function projectToTrack(point) {
  const { chain, totalLen } = computeTrackChain();
  if (!chain.length) {
    return null;
  }

  let best = null;
  for (const seg of chain) {
    const proj = nearestPointOnSegment(point, seg.from, seg.to);
    if (!best || proj.dist < best.dist) {
      best = {
        x: proj.x,
        y: proj.y,
        dist: proj.dist,
        s: seg.startS + seg.len * proj.t,
        totalLen
      };
    }
  }
  return best;
}

function pointAtS(s) {
  const { chain, totalLen } = computeTrackChain();
  if (!chain.length) {
    return null;
  }
  const clamped = Math.max(0, Math.min(totalLen, s));
  for (const seg of chain) {
    if (clamped >= seg.startS && clamped <= seg.endS) {
      const t = seg.len === 0 ? 0 : (clamped - seg.startS) / seg.len;
      return {
        x: seg.from.x + (seg.to.x - seg.from.x) * t,
        y: seg.from.y + (seg.to.y - seg.from.y) * t
      };
    }
  }
  const last = chain[chain.length - 1].to;
  return { x: last.x, y: last.y };
}

function stationByName(name) {
  return state.stations.find((s) => s.name === name);
}

function buildTrainFromForm(name, rawStops) {
  const parts = rawStops
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return { error: 'Stops must contain at least two entries.' };
  }

  const stops = [];
  for (const part of parts) {
    const [stationName, timeText] = part.split('@').map((x) => x.trim());
    const st = stationByName(stationName);
    const t = parseTime(timeText || '');
    if (!st || t === null) {
      return { error: `Invalid stop: ${part}` };
    }
    stops.push({ stationName, t, s: st.s });
  }

  for (let i = 1; i < stops.length; i += 1) {
    if (stops[i].t <= stops[i - 1].t) {
      return { error: 'Times must be strictly increasing.' };
    }
  }

  return {
    train: {
      id: crypto.randomUUID(),
      name,
      stops,
      activeS: stops[0].s,
      active: false
    }
  };
}

function trainPositionAtTime(train, nowMinute) {
  const first = train.stops[0];
  const last = train.stops[train.stops.length - 1];
  if (nowMinute < first.t) {
    return first.s;
  }
  if (nowMinute >= last.t) {
    return last.s;
  }

  for (let i = 1; i < train.stops.length; i += 1) {
    const a = train.stops[i - 1];
    const b = train.stops[i];
    if (nowMinute >= a.t && nowMinute < b.t) {
      const ratio = (nowMinute - a.t) / (b.t - a.t);
      return a.s + (b.s - a.s) * ratio;
    }
  }
  return first.s;
}

function updateTrains() {
  for (const train of state.trains) {
    train.activeS = trainPositionAtTime(train, state.simMinute);
    const firstT = train.stops[0].t;
    const lastT = train.stops[train.stops.length - 1].t;
    train.active = state.simMinute >= firstT && state.simMinute <= lastT;
  }
}

function drawTrack() {
  const pts = state.trackPoints;
  if (pts.length < 2) {
    return;
  }

  const renderPts = samplePolylineBySpacing(pts, 6);
  const isCad = state.rules.renderMode === 'cad';
  ctx.strokeStyle = isCad ? '#bdeaff' : '#d8e3ec';
  ctx.lineWidth = isCad ? 1.8 : 2.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(renderPts[0].x, renderPts[0].y);
  for (let i = 1; i < renderPts.length; i += 1) {
    ctx.lineTo(renderPts[i].x, renderPts[i].y);
  }
  ctx.stroke();
}

function drawTrackCad() {
  const pts = state.trackPoints;
  if (pts.length < 2) {
    return;
  }

  const renderPts = samplePolylineBySpacing(pts, 6);
  const railOffset = JR_NARROW_GAUGE_CAD.modelGaugeMm / 2;

  drawCadSleepers(renderPts, JR_NARROW_GAUGE_CAD);
  drawOffsetRail(renderPts, railOffset, '#c8f3ff', JR_NARROW_GAUGE_CAD.railWidthMm);
  drawOffsetRail(renderPts, -railOffset, '#c8f3ff', JR_NARROW_GAUGE_CAD.railWidthMm);
}

function drawCadSleepers(points, spec) {
  if (!points || points.length < 2) {
    return;
  }

  if (state.view.zoom < 0.65) {
    return;
  }

  ctx.strokeStyle = 'rgba(149, 222, 249, 0.56)';
  ctx.lineWidth = spec.sleeperLineMm;
  ctx.lineCap = 'butt';

  const half = spec.sleeperLengthMm / 2;
  const stepBase = spec.sleeperSpacingMm;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) {
      continue;
    }

    const tx = dx / len;
    const ty = dy / len;
    const nx = -ty;
    const ny = tx;
    const curveTighten = localCurveIntensity(points, i) * spec.sleeperCurveDenseFactor;
    const step = stepBase * (1 - curveTighten);

    for (let s = 0; s <= len; s += step) {
      const px = a.x + tx * s;
      const py = a.y + ty * s;
      ctx.beginPath();
      ctx.moveTo(px - nx * half, py - ny * half);
      ctx.lineTo(px + nx * half, py + ny * half);
      ctx.stroke();
    }
  }
}

function drawTrackRealistic() {
  const pts = state.trackPoints;
  if (pts.length < 2) {
    return;
  }

  const preset = TRACK_PRESETS[state.rules.trackPreset] || TRACK_PRESETS.ballast_main;
  const renderPts = samplePolylineBySpacing(pts, 6);

  // Ballast shoulder and center layers
  ctx.strokeStyle = preset.ballastOuter;
  ctx.lineWidth = preset.ballastWidth + 4.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(renderPts[0].x, renderPts[0].y);
  for (let i = 1; i < renderPts.length; i += 1) {
    ctx.lineTo(renderPts[i].x, renderPts[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = preset.ballastMid;
  ctx.lineWidth = preset.ballastWidth;
  ctx.beginPath();
  ctx.moveTo(renderPts[0].x, renderPts[0].y);
  for (let i = 1; i < renderPts.length; i += 1) {
    ctx.lineTo(renderPts[i].x, renderPts[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = preset.ballastInner;
  ctx.lineWidth = preset.ballastWidth - 3.2;
  ctx.beginPath();
  ctx.moveTo(renderPts[0].x, renderPts[0].y);
  for (let i = 1; i < renderPts.length; i += 1) {
    ctx.lineTo(renderPts[i].x, renderPts[i].y);
  }
  ctx.stroke();

  drawSleepers(renderPts, preset);
  drawOffsetRail(renderPts, preset.railGap, preset.railBaseColor, preset.railWidth + 0.8);
  drawOffsetRail(renderPts, -preset.railGap, preset.railBaseColor, preset.railWidth + 0.8);
  drawOffsetRail(renderPts, preset.railGap, preset.railHighlightColor, preset.railWidth);
  drawOffsetRail(renderPts, -preset.railGap, preset.railHighlightColor, preset.railWidth);
}

function samplePolylineBySpacing(points, spacing) {
  if (!points || points.length < 2) {
    return points || [];
  }

  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) {
      continue;
    }

    const steps = Math.max(1, Math.round(len / spacing));
    for (let j = 1; j <= steps; j += 1) {
      const t = j / steps;
      out.push({
        x: a.x + dx * t,
        y: a.y + dy * t
      });
    }
  }
  return out;
}

function drawOffsetRail(points, offset, color, width) {
  if (points.length < 2) {
    return;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) {
      continue;
    }

    const nx = -dy / len;
    const ny = dx / len;
    ctx.beginPath();
    ctx.moveTo(a.x + nx * offset, a.y + ny * offset);
    ctx.lineTo(b.x + nx * offset, b.y + ny * offset);
    ctx.stroke();
  }
}

function drawGhostOffsetRail(points, offset, color, width) {
  if (points.length < 2) {
    return;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([5, 4]);

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) {
      continue;
    }

    const nx = -dy / len;
    const ny = dx / len;
    ctx.beginPath();
    ctx.moveTo(a.x + nx * offset, a.y + ny * offset);
    ctx.lineTo(b.x + nx * offset, b.y + ny * offset);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawGhostSleepers(points, sleeperLength, sleeperStep, color, thickness) {
  if (points.length < 2) {
    return;
  }

  const half = sleeperLength / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'butt';

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) {
      continue;
    }

    const tx = dx / len;
    const ty = dy / len;
    const nx = -ty;
    const ny = tx;

    for (let s = 0; s <= len; s += sleeperStep) {
      const px = a.x + tx * s;
      const py = a.y + ty * s;
      ctx.beginPath();
      ctx.moveTo(px - nx * half, py - ny * half);
      ctx.lineTo(px + nx * half, py + ny * half);
      ctx.stroke();
    }
  }
}

function drawGhostTrackSegment(from, to) {
  const poly = samplePolylineBySpacing([from, to], 6);
  if (poly.length < 2) {
    return;
  }

  ctx.strokeStyle = 'rgba(111, 212, 255, 0.92)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i += 1) {
    ctx.lineTo(poly[i].x, poly[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGhostTrackPolyline(points) {
  if (!points || points.length < 2) {
    return;
  }
  for (let i = 1; i < points.length; i += 1) {
    drawGhostTrackSegment(points[i - 1], points[i]);
  }
}

function drawSleepers(points, preset) {
  if (points.length < 2) {
    return;
  }

  const half = preset.sleeperWidth / 2;
  const stepBase = preset.sleeperStep;

  ctx.strokeStyle = preset.sleeperColor;
  ctx.lineWidth = preset.sleeperThickness;
  ctx.lineCap = 'round';

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) {
      continue;
    }

    const tx = dx / len;
    const ty = dy / len;
    const nx = -ty;
    const ny = tx;
    const curveTighten = localCurveIntensity(points, i) * (preset.sleeperStepCurveFactor || 0);
    const step = stepBase * (1 - curveTighten);

    for (let s = 0; s <= len; s += step) {
      const px = a.x + tx * s;
      const py = a.y + ty * s;
      ctx.beginPath();
      ctx.moveTo(px - nx * half, py - ny * half);
      ctx.lineTo(px + nx * half, py + ny * half);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(222, 195, 166, 0.25)';
      ctx.lineWidth = Math.max(0.6, preset.sleeperThickness - 0.5);
      ctx.beginPath();
      ctx.moveTo(px - nx * (half * 0.45), py - ny * (half * 0.45));
      ctx.lineTo(px + nx * (half * 0.45), py + ny * (half * 0.45));
      ctx.stroke();

      ctx.strokeStyle = preset.sleeperColor;
      ctx.lineWidth = preset.sleeperThickness;
    }
  }
}

function localCurveIntensity(points, segmentIndex) {
  if (segmentIndex <= 1 || segmentIndex >= points.length - 1) {
    return 0;
  }

  const p0 = points[segmentIndex - 1];
  const p1 = points[segmentIndex];
  const p2 = points[segmentIndex + 1];
  const v1x = p1.x - p0.x;
  const v1y = p1.y - p0.y;
  const v2x = p2.x - p1.x;
  const v2y = p2.y - p1.y;
  const l1 = Math.hypot(v1x, v1y);
  const l2 = Math.hypot(v2x, v2y);
  if (l1 < 0.0001 || l2 < 0.0001) {
    return 0;
  }

  const dot = (v1x * v2x + v1y * v2y) / (l1 * l2);
  const clamped = Math.max(-1, Math.min(1, dot));
  const turn = Math.acos(clamped);
  return Math.min(1, turn / (Math.PI / 4));
}

function drawTrackWarnings() {
  const pts = state.trackPoints;
  const warnings = state.diagnostics.sharpCurveIndices;
  if (pts.length < 3 || warnings.length === 0) {
    return;
  }

  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const idx of warnings) {
    const a = pts[idx - 1];
    const b = pts[idx];
    const c = pts[idx + 1];

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();

    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function formatCadDimensionLabel(lengthMm) {
  // Blueprint style: keep integers and omit unit suffix in dense views.
  return `${Math.round(lengthMm)}`;
}

function drawDimensionArrow(x, y, tx, ty, size = 6) {
  const bx = -tx * size;
  const by = -ty * size;
  const nx = -ty * size * 0.5;
  const ny = tx * size * 0.5;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + bx + nx, y + by + ny);
  ctx.lineTo(x + bx - nx, y + by - ny);
  ctx.closePath();
  ctx.fill();
}

function shouldShowTrackDimensions() {
  const layers = state.rules.layers;
  if (!layers.track) {
    return false;
  }

  if (layers.dimensions) {
    return true;
  }

  // Layer-driven fallback: when track is the only drawing target, show track dimensions.
  return !layers.stations && !layers.trains && !layers.curveInfo && !layers.warnings;
}

function drawTrackDimensions() {
  if (!shouldShowTrackDimensions()) {
    return;
  }

  const pts = state.trackPoints;
  if (pts.length < 2) {
    return;
  }

  ctx.font = '600 10px Rajdhani';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = distance(a, b);
    if (len < 14) {
      continue;
    }

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.0001) {
      continue;
    }

    const tx = dx / segLen;
    const ty = dy / segLen;
    let nx = -ty;
    let ny = tx;

    // Keep dimensions on a consistent visual side for continuous chains.
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }

    const offset = 16 + ((i - 1) % 3) * 12;
    const extOver = 5;
    const p1x = a.x + nx * offset;
    const p1y = a.y + ny * offset;
    const p2x = b.x + nx * offset;
    const p2y = b.y + ny * offset;

    // Extension lines from measured geometry to the dimension line.
    ctx.strokeStyle = 'rgba(132, 206, 236, 0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + nx * (offset + extOver), a.y + ny * (offset + extOver));
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + nx * (offset + extOver), b.y + ny * (offset + extOver));
    ctx.stroke();

    // Dimension line.
    ctx.strokeStyle = 'rgba(162, 225, 248, 0.86)';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();

    // Arrowheads at both ends.
    ctx.fillStyle = 'rgba(182, 234, 252, 0.95)';
    drawDimensionArrow(p1x, p1y, tx, ty, 5.8);
    drawDimensionArrow(p2x, p2y, -tx, -ty, 5.8);

    let angle = Math.atan2(ty, tx);
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
      angle += Math.PI;
    }

    const mx = (p1x + p2x) / 2;
    const my = (p1y + p2y) / 2;
    const label = formatCadDimensionLabel(len);

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.fillStyle = '#d5f0ff';
    ctx.strokeStyle = 'rgba(3, 19, 34, 0.92)';
    ctx.lineWidth = 2.2;
    ctx.strokeText(label, 0, -7.5);
    ctx.fillStyle = '#d5f0ff';
    ctx.fillText(label, 0, -7.5);
    ctx.restore();
  }
}

function drawCurveAnnotations() {
  if (!state.rules.layers.curveInfo) {
    return;
  }

  const pts = state.trackPoints;
  if (pts.length < 3) {
    return;
  }

  ctx.font = '600 9px Rajdhani';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 1; i < pts.length - 1; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];

    const v1x = a.x - b.x;
    const v1y = a.y - b.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;
    const l1 = Math.hypot(v1x, v1y);
    const l2 = Math.hypot(v2x, v2y);
    if (l1 < 1 || l2 < 1) {
      continue;
    }

    const a1 = Math.atan2(v1y, v1x);
    const a2 = Math.atan2(v2y, v2x);
    let d = a2 - a1;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) < 0.08) {
      continue;
    }

    const turnDeg = Math.abs(d) * 180 / Math.PI;
    const radius = circumcircleRadius(a, b, c);
    if (!Number.isFinite(radius) || radius > 99999) {
      continue;
    }

    const arcR = 14;
    const end = a1 + d;
    const ccw = d < 0;

    ctx.strokeStyle = 'rgba(138, 208, 238, 0.58)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, arcR, a1, end, ccw);
    ctx.stroke();

    const midA = a1 + d * 0.5;
    const tx = b.x + Math.cos(midA) * (arcR + 16);
    const ty = b.y + Math.sin(midA) * (arcR + 16);
    const label = `R${Math.round(radius)} / ${Math.round(turnDeg)}deg`;
    const tw = ctx.measureText(label).width;
    const bw = tw + 6;
    const bh = 10;

    ctx.fillStyle = 'rgba(4, 20, 38, 0.84)';
    ctx.fillRect(tx - bw / 2, ty - bh / 2, bw, bh);
    ctx.strokeStyle = 'rgba(122, 196, 230, 0.56)';
    ctx.strokeRect(tx - bw / 2, ty - bh / 2, bw, bh);
    ctx.fillStyle = '#d8f2ff';
    ctx.fillText(label, tx, ty + 0.4);
  }
}

function drawPartPreview() {
  const p = state.partBuilder.preview;
  if (!p || state.mode !== 'part') {
    return;
  }

  ctx.strokeStyle = 'rgba(216, 242, 255, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(p.polyline[0].x, p.polyline[0].y);
  for (let i = 1; i < p.polyline.length; i += 1) {
    ctx.lineTo(p.polyline[i].x, p.polyline[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#b7d9eb';
  ctx.beginPath();
  ctx.arc(p.start.x, p.start.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6effc2';
  ctx.beginPath();
  ctx.arc(p.end.x, p.end.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCadGrid() {
  const minorWorld = 40;
  const majorWorld = 200;
  const minorPx = minorWorld * state.view.zoom;
  const majorPx = majorWorld * state.view.zoom;
  if (minorPx < 6) {
    return;
  }

  const startXMinor = ((state.view.offsetX % minorPx) + minorPx) % minorPx;
  const startYMinor = ((state.view.offsetY % minorPx) + minorPx) % minorPx;

  ctx.strokeStyle = 'rgba(129, 189, 222, 0.16)';
  ctx.lineWidth = 1;
  for (let x = startXMinor; x < canvas.width; x += minorPx) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = startYMinor; y < canvas.height; y += minorPx) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const startXMajor = ((state.view.offsetX % majorPx) + majorPx) % majorPx;
  const startYMajor = ((state.view.offsetY % majorPx) + majorPx) % majorPx;
  ctx.strokeStyle = 'rgba(155, 218, 246, 0.32)';
  for (let x = startXMajor; x < canvas.width; x += majorPx) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = startYMajor; y < canvas.height; y += majorPx) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawBuildingTrack() {
  const pts = state.buildingTrack;
  if (pts.length > 1) {
    drawGhostTrackPolyline(pts);
  }

  if (state.mode !== 'track') {
    return;
  }

  if (pts.length > 0) {
    const start = pts[0];
    ctx.fillStyle = '#d2efff';
    ctx.beginPath();
    ctx.arc(start.x, start.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8e8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#c7ebff';
    ctx.font = '700 11px Orbitron';
    ctx.fillText('START', start.x + 14, start.y - 14);
  }

  for (const p of pts) {
    ctx.fillStyle = '#bee6fb';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.trackPreviewPoint) {
    const preview = state.trackPreviewPoint;
    const from = pts.length > 0 ? pts[pts.length - 1] : preview;
    if (pts.length > 0) {
      drawGhostTrackSegment(from, preview);
    }

    ctx.fillStyle = 'rgba(196, 234, 252, 0.92)';
    ctx.beginPath();
    ctx.arc(preview.x, preview.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStations() {
  for (const st of state.stations) {
    ctx.fillStyle = '#f1c86a';
    ctx.beginPath();
    ctx.arc(st.x, st.y, 8, 0, Math.PI * 2);
    ctx.fill();

    if (state.selectedStationIds.has(st.id)) {
      ctx.strokeStyle = '#41f0a7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(st.x, st.y, 11, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#cff0ff';
    ctx.font = '600 12px Rajdhani';
    ctx.fillText(st.name, st.x + 10, st.y - 10);
  }
}

function drawSelectionRect() {
  if (!state.selection.active || !state.selection.start || !state.selection.current) {
    return;
  }

  const r = normalizeRect(state.selection.start, state.selection.current);
  if (r.w < 2 && r.h < 2) {
    return;
  }

  ctx.strokeStyle = '#62dfff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(86, 210, 246, 0.16)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
}

function drawTrains() {
  for (const train of state.trains) {
    const p = pointAtS(train.activeS);
    if (!p) {
      continue;
    }

    ctx.fillStyle = train.active ? '#d1495b' : '#8f5a61';
    ctx.beginPath();
    ctx.rect(p.x - 8, p.y - 5, 16, 10);
    ctx.fill();

    if (state.selectedTrainIds.has(train.id)) {
      ctx.strokeStyle = '#41f0a7';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 11, p.y - 8, 22, 16);
    }

    ctx.fillStyle = '#cff0ff';
    ctx.font = '600 11px Rajdhani';
    ctx.fillText(train.name, p.x + 10, p.y + 4);
  }
}

function drawClock() {
  ctx.fillStyle = '#96e8ff';
  ctx.font = '700 14px Orbitron';
  const warnCount = state.diagnostics.sharpCurveIndices.length;
  const warnText = warnCount > 0 ? `  Sharp Curves: ${warnCount}` : '';
  ctx.fillText(`Sim Time: ${fmtTime(state.simMinute)}  Zoom: x${state.view.zoom.toFixed(2)}${warnText}`, 16, 24);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.rules.layers.grid) {
    drawCadGrid();
  }

  ctx.save();
  ctx.setTransform(state.view.zoom, 0, 0, state.view.zoom, state.view.offsetX, state.view.offsetY);
  if (state.rules.layers.track) {
    drawTrack();
    drawTrackDimensions();
    drawCurveAnnotations();
  }
  if (state.rules.layers.warnings) {
    drawTrackWarnings();
  }
  drawBuildingTrack();
  drawPartPreview();
  if (state.rules.layers.stations) {
    drawStations();
  }
  if (state.rules.layers.trains) {
    drawTrains();
  }
  drawSelectionRect();
  ctx.restore();

  drawClock();
}

function rebuildStationList() {
  stationList.innerHTML = '';
  for (const st of state.stations) {
    const li = document.createElement('li');
    li.textContent = `${st.name} (s=${st.s.toFixed(1)})`;
    if (state.selectedStationIds.has(st.id)) {
      li.classList.add('selected-item');
    }
    stationList.appendChild(li);
  }
}

function rebuildTrainList() {
  trainList.innerHTML = '';
  for (const tr of state.trains) {
    const li = document.createElement('li');
    const first = tr.stops[0];
    const last = tr.stops[tr.stops.length - 1];
    li.textContent = `${tr.name} ${first.stationName} ${fmtTime(first.t)} -> ${last.stationName} ${fmtTime(last.t)}`;
    if (state.selectedTrainIds.has(tr.id)) {
      li.classList.add('selected-item');
    }
    trainList.appendChild(li);
  }
}

function updateHint() {
  const mode = state.mode;
  if (mode === 'select') {
    hintText.textContent =
      'Select mode: Left-click selects, Ctrl/Cmd+click toggles, left-drag pans map, Shift+drag range-selects.';
    return;
  }
  if (mode === 'part') {
    hintText.textContent =
      'Part mode: choose N-gauge part in palette, click to set anchor, then click to place connected part. Esc resets anchor.';
    return;
  }
  if (mode === 'track') {
    hintText.textContent =
      'Track mode: Left-click to place start/end points. Double-click or right-click commits line. Mouse wheel zooms map.';
    return;
  }
  if (mode === 'station') {
    hintText.textContent = 'Station mode: Left-click near route to place station.';
    return;
  }
  hintText.textContent = 'Train mode: Add trains from right panel using station@hh:mm format.';
}

canvas.addEventListener('contextmenu', (ev) => {
  ev.preventDefault();
  commitTrackDraft();
});

canvas.addEventListener('dblclick', (ev) => {
  if (state.mode !== 'track') {
    return;
  }

  ev.preventDefault();
  commitTrackDraft();
});

canvas.addEventListener('mousedown', (ev) => {
  if (state.mode === 'select' && ev.button === 0 && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey) {
    state.view.panning = true;
    state.view.panLast = toCanvasScreenPoint(ev);
    state.view.panDistance = 0;
    state.view.justPanned = false;
    return;
  }

  if (ev.button === 1) {
    ev.preventDefault();
    state.view.panning = true;
    state.view.panLast = toCanvasScreenPoint(ev);
    state.view.panDistance = 0;
    state.view.justPanned = false;
    return;
  }

  if (state.mode !== 'select' || ev.button !== 0 || !ev.shiftKey) {
    return;
  }

  const p = toCanvasPoint(ev);
  state.selection.active = true;
  state.selection.start = p;
  state.selection.current = p;
  state.selection.append = ev.shiftKey;
});

canvas.addEventListener('mousemove', (ev) => {
  if (state.view.panning && state.view.panLast) {
    const p = toCanvasScreenPoint(ev);
    const dx = p.x - state.view.panLast.x;
    const dy = p.y - state.view.panLast.y;
    state.view.offsetX += dx;
    state.view.offsetY += dy;
    state.view.panDistance += Math.hypot(dx, dy);
    state.view.panLast = p;
    state.view.justPanned = state.view.panDistance > 3;
    render();
    return;
  }

  if (state.mode === 'track') {
    state.trackPreviewPoint = toCanvasPoint(ev);
    render();
    return;
  }

  if (state.mode === 'part') {
    const p = toCanvasPoint(ev);
    if (state.partBuilder.anchor) {
      const anchor = state.partBuilder.anchor;
      const dx = p.x - anchor.x;
      const dy = p.y - anchor.y;
      if (Math.hypot(dx, dy) > 0.1) {
        state.partBuilder.headingRad = Math.atan2(dy, dx);
      }
      state.partBuilder.preview = samplePartGeometry(
        anchor,
        state.partBuilder.headingRad,
        state.partBuilder.partType,
        state.partBuilder.curveTurn
      );
    } else {
      state.partBuilder.preview = null;
    }
    render();
    return;
  }

  if (!state.selection.active || state.mode !== 'select') {
    return;
  }

  state.selection.current = toCanvasPoint(ev);
  render();
});

canvas.addEventListener('mouseup', () => {
  if (state.view.panning) {
    state.view.panning = false;
    state.view.panLast = null;
    if (state.view.panDistance <= 3) {
      state.view.justPanned = false;
    }
    return;
  }

  if (!state.selection.active || state.mode !== 'select' || !state.selection.start || !state.selection.current) {
    return;
  }

  const r = normalizeRect(state.selection.start, state.selection.current);
  state.selection.active = false;
  const append = state.selection.append;
  state.selection.start = null;
  state.selection.current = null;
  state.selection.append = false;

  if (!append) {
    clearSelection();
  }

  const hasRange = r.w > 3 || r.h > 3;
  if (hasRange && state.selectionFilters.station) {
    for (const st of state.stations) {
      const inX = st.x >= r.x && st.x <= r.x + r.w;
      const inY = st.y >= r.y && st.y <= r.y + r.h;
      if (inX && inY) {
        state.selectedStationIds.add(st.id);
      }
    }
  }

  if (hasRange && state.selectionFilters.train) {
    for (const tr of state.trains) {
      const p = pointAtS(tr.activeS);
      if (!p) {
        continue;
      }
      const inX = p.x >= r.x && p.x <= r.x + r.w;
      const inY = p.y >= r.y && p.y <= r.y + r.h;
      if (inX && inY) {
        state.selectedTrainIds.add(tr.id);
      }
    }
  }

  rebuildStationList();
  rebuildTrainList();
  render();
});

canvas.addEventListener('mouseleave', () => {
  if (state.view.panning) {
    state.view.panning = false;
    state.view.panLast = null;
    state.view.panDistance = 0;
  }

  if (state.mode === 'track' && state.trackPreviewPoint) {
    state.trackPreviewPoint = null;
    render();
  }
});

canvas.addEventListener(
  'wheel',
  (ev) => {
    ev.preventDefault();

    const screenPoint = toCanvasScreenPoint(ev);
    const worldBefore = {
      x: (screenPoint.x - state.view.offsetX) / state.view.zoom,
      y: (screenPoint.y - state.view.offsetY) / state.view.zoom
    };

    const zoomFactor = ev.deltaY < 0 ? 1.12 : 0.9;
    const nextZoom = clamp(state.view.zoom * zoomFactor, state.view.minZoom, state.view.maxZoom);
    if (nextZoom === state.view.zoom) {
      return;
    }

    state.view.zoom = nextZoom;
    state.view.offsetX = screenPoint.x - worldBefore.x * state.view.zoom;
    state.view.offsetY = screenPoint.y - worldBefore.y * state.view.zoom;
    render();
  },
  { passive: false }
);

canvas.addEventListener('click', (ev) => {
  const p0 = toCanvasPoint(ev);
  const x = p0.x;
  const y = p0.y;

  if (state.mode === 'select') {
    if (state.view.justPanned) {
      state.view.justPanned = false;
      return;
    }
    const selectMode = ev.ctrlKey || ev.metaKey ? 'toggle' : ev.shiftKey ? 'append' : 'replace';
    selectByClick({ x, y }, selectMode);
    return;
  }

  if (state.mode === 'track') {
    const last = state.buildingTrack[state.buildingTrack.length - 1];
    let nextPoint = { x, y };

    const snap = snapToTrackEndpoint(nextPoint);
    if (snap) {
      nextPoint = { x: snap.point.x, y: snap.point.y };
      if (!last) {
        state.draftConstraintHeadingRad = snap.headingRad;
        setHintTemporary('既存線路の端点にスナップしました。');
      }
    }

    if (!last) {
      state.buildingTrack.push(nextPoint);
      commitHistory();
      render();
      return;
    }

    const segLen = distance(last, nextPoint);
    if (segLen < TRACK_CONNECTION_RULES.minSegmentLength) {
      setHintTemporary('短すぎる線分は敷設できません。');
      return;
    }

    if (state.buildingTrack.length === 1 && Number.isFinite(state.draftConstraintHeadingRad)) {
      const h = Math.atan2(nextPoint.y - last.y, nextPoint.x - last.x);
      const lim = (TRACK_CONNECTION_RULES.maxInitialDeflectionDeg * Math.PI) / 180;
      if (angleDiffAbs(h, state.draftConstraintHeadingRad) > lim) {
        setHintTemporary('接続角が急すぎます。既存線路の向きに近づけてください。');
        return;
      }
    }

    if (isIllegalIntersection(last, nextPoint)) {
      setHintTemporary('既存線路と不正に交差するため敷設できません。');
      return;
    }

    if (distance(last, nextPoint) > 2) {
      state.buildingTrack.push(nextPoint);
    }
    commitHistory();
    render();
    return;
  }

  if (state.mode === 'part') {
    const clickPoint = { x, y };

    if (!state.partBuilder.anchor) {
      const fallback = anchorFromTrackEnd();
      if (fallback) {
        state.partBuilder.anchor = { x: fallback.x, y: fallback.y };
        state.partBuilder.headingRad = fallback.headingRad;
      } else {
        state.partBuilder.anchor = clickPoint;
        state.partBuilder.headingRad = 0;
      }
      render();
      return;
    }

    const dx = clickPoint.x - state.partBuilder.anchor.x;
    const dy = clickPoint.y - state.partBuilder.anchor.y;
    if (Math.hypot(dx, dy) > 0.5) {
      state.partBuilder.headingRad = Math.atan2(dy, dx);
    }

    const placed = samplePartGeometry(
      state.partBuilder.anchor,
      state.partBuilder.headingRad,
      state.partBuilder.partType,
      state.partBuilder.curveTurn
    );
    commitPartPlacement(placed);
    return;
  }

  if (state.mode === 'station') {
    const p = projectToTrack({ x, y });
    if (!p || p.dist > 35) {
      return;
    }

    const station = {
      id: crypto.randomUUID(),
      name: nextStationName(),
      x: p.x,
      y: p.y,
      s: p.s
    };
    state.stations.push(station);
    commitHistory();
    rebuildStationList();
    render();
  }
});

modeSelect.addEventListener('change', () => {
  state.mode = modeSelect.value;
  state.trackPreviewPoint = null;
  state.draftConstraintHeadingRad = null;
  state.selection.active = false;
  state.selection.start = null;
  state.selection.current = null;
  state.selection.append = false;
  syncSelectionFilterMenu();
  syncPartPaletteMenu();
  updateHint();
  render();
});

undoBtn.addEventListener('click', () => {
  undo();
});

redoBtn.addEventListener('click', () => {
  redo();
});

deleteSelectedBtn.addEventListener('click', () => {
  deleteSelectedEntities();
});

filterStation.addEventListener('change', () => {
  state.selectionFilters.station = filterStation.checked;
});

filterSignal.addEventListener('change', () => {
  state.selectionFilters.signal = filterSignal.checked;
});

filterObject.addEventListener('change', () => {
  state.selectionFilters.object = filterObject.checked;
});

filterTrain.addEventListener('change', () => {
  state.selectionFilters.train = filterTrain.checked;
});

partTypeSelect.addEventListener('change', () => {
  state.partBuilder.partType = partTypeSelect.value;
  render();
});

curveTurnSelect.addEventListener('change', () => {
  state.partBuilder.curveTurn = curveTurnSelect.value;
  render();
});

resetPartAnchorBtn.addEventListener('click', () => {
  resetPartAnchor();
});

playBtn.addEventListener('click', () => {
  state.isRunning = !state.isRunning;
  playBtn.textContent = state.isRunning ? 'Pause' : 'Play';
});

speedRange.addEventListener('input', () => {
  state.simSpeed = Number(speedRange.value);
  speedLabel.textContent = `x${state.simSpeed}`;
});

minRadiusRange.addEventListener('input', () => {
  state.rules.minRadius = Number(minRadiusRange.value);
  minRadiusLabel.textContent = `R>=${state.rules.minRadius}`;
  updateTrackDiagnostics();
  render();
});

trackPresetSelect.addEventListener('change', () => {
  state.rules.trackPreset = trackPresetSelect.value;
  render();
});

renderModeSelect.addEventListener('change', () => {
  state.rules.renderMode = renderModeSelect.value;
  render();
});

layerGrid.addEventListener('change', () => {
  state.rules.layers.grid = layerGrid.checked;
  render();
});

layerTrack.addEventListener('change', () => {
  state.rules.layers.track = layerTrack.checked;
  render();
});

layerStations.addEventListener('change', () => {
  state.rules.layers.stations = layerStations.checked;
  render();
});

layerTrains.addEventListener('change', () => {
  state.rules.layers.trains = layerTrains.checked;
  render();
});

layerDimensions.addEventListener('change', () => {
  state.rules.layers.dimensions = layerDimensions.checked;
  state.rules.showDimensions = state.rules.layers.dimensions;
  render();
});

layerCurveInfo.addEventListener('change', () => {
  state.rules.layers.curveInfo = layerCurveInfo.checked;
  render();
});

layerWarnings.addEventListener('change', () => {
  state.rules.layers.warnings = layerWarnings.checked;
  render();
});

resetBtn.addEventListener('click', () => {
  state.simMinute = 360;
  updateTrains();
  render();
});

trainForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const name = trainNameInput.value.trim();
  const text = trainStopsInput.value.trim();
  const built = buildTrainFromForm(name, text);
  if (built.error) {
    alert(built.error);
    return;
  }

  state.trains.push(built.train);
  commitHistory();
  rebuildTrainList();
  updateTrains();
  render();

  const nextIdNum = state.trains.length + 1;
  trainNameInput.value = `T${String(nextIdNum).padStart(3, '0')}`;
});

window.addEventListener('keydown', (ev) => {
  const tag = (ev.target && ev.target.tagName) || '';
  const editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
    ev.preventDefault();
    saveProjectToLocal();
    setHintTemporary('Project saved to local storage.');
    return;
  }

  if (ev.key === 'Escape') {
    if (cancelTrackBuilding()) {
      setHintTemporary('Track draft canceled.');
      ev.preventDefault();
      return;
    }
    if (state.mode === 'part' && state.partBuilder.anchor) {
      resetPartAnchor();
      setHintTemporary('Part anchor reset.');
      ev.preventDefault();
    }
    return;
  }

  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) {
    ev.preventDefault();
    undo();
    return;
  }

  if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) {
    ev.preventDefault();
    redo();
    return;
  }

  if (!editing && (ev.key === 'Delete' || ev.key === 'Backspace')) {
    if (state.mode === 'select' && (state.selectedStationIds.size > 0 || state.selectedTrainIds.size > 0)) {
      ev.preventDefault();
      deleteSelectedEntities();
    }
  }
});

let lastTs = performance.now();
function tick(ts) {
  const deltaSec = (ts - lastTs) / 1000;
  lastTs = ts;

  if (state.isRunning) {
    state.simMinute += deltaSec * state.simSpeed;
    updateTrains();
  }

  render();
  requestAnimationFrame(tick);
}

updateHint();
syncSelectionFilterMenu();
syncPartPaletteMenu();
minRadiusLabel.textContent = `R>=${state.rules.minRadius}`;
trackPresetSelect.value = state.rules.trackPreset;
renderModeSelect.value = state.rules.renderMode;
layerGrid.checked = state.rules.layers.grid;
layerTrack.checked = state.rules.layers.track;
layerStations.checked = state.rules.layers.stations;
layerTrains.checked = state.rules.layers.trains;
layerDimensions.checked = state.rules.layers.dimensions;
layerCurveInfo.checked = state.rules.layers.curveInfo;
layerWarnings.checked = state.rules.layers.warnings;
partTypeSelect.value = state.partBuilder.partType;
curveTurnSelect.value = state.partBuilder.curveTurn;
if (!loadProjectFromLocal()) {
  updateTrains();
  updateTrackDiagnostics();
  state.history.push(snapshotState());
  updateUndoRedoButtons();
  setHintTemporary('No saved project found. Working with a new project.', 1400);
} else {
  setHintTemporary('Loaded last saved project (local storage).', 1400);
}

window.addEventListener('resize', () => {
  updateHudLayoutMetrics();
  resizeCanvasToViewport();
});
updateHudLayoutMetrics();
resizeCanvasToViewport();
setTimeout(updateHudLayoutMetrics, 0);
requestAnimationFrame(tick);
