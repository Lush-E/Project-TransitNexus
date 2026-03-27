const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const gpuCanvas = document.getElementById('gpuStage');
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
const modeSettingGroups = Array.from(document.querySelectorAll('.track-settings label[data-setting-group]'));
const viaductEditSwitch = document.getElementById('viaductEditSwitch');
const viaductWallEditBtn = document.getElementById('viaductWallEditBtn');
const viaductAreaEditBtn = document.getElementById('viaductAreaEditBtn');
const zoomStat = document.getElementById('zoomStat');
const countStat = document.getElementById('countStat');
const saveNotice = document.getElementById('saveNotice');
const modeLabel = document.getElementById('modeLabel');
const modeSteps = document.getElementById('modeSteps');
const gridSizeSelect = document.getElementById('gridSizeSelect');
const snapToggle = document.getElementById('snapToggle');
const orthoToggle = document.getElementById('orthoToggle');
const trackWidthRange = document.getElementById('trackWidthRange');
const trackWidthLabel = document.getElementById('trackWidthLabel');
const trackLevelInput = document.getElementById('trackLevelInput');
const levelUpBtn = document.getElementById('levelUpBtn');
const levelDownBtn = document.getElementById('levelDownBtn');
const levelIndicator = document.getElementById('levelIndicator');
const trackGradientSelect = document.getElementById('trackGradientSelect');
const trackLineTypeSelect = document.getElementById('trackLineTypeSelect');
const trackColorInput = document.getElementById('trackColorInput');
const toggleLineColorPanelBtn = document.getElementById('toggleLineColorPanelBtn');
const lineColorPanel = document.getElementById('lineColorPanel');
const lineColorPanelHandle = document.getElementById('lineColorPanelHandle');
const saveLineColorBtn = document.getElementById('saveLineColorBtn');
const savedLineColorList = document.getElementById('savedLineColorList');
const savedLineColorActions = document.getElementById('savedLineColorActions');
const renameLineColorBtn = document.getElementById('renameLineColorBtn');
const deleteLineColorBtn = document.getElementById('deleteLineColorBtn');
const renameLineColorEditor = document.getElementById('renameLineColorEditor');
const renameLineColorInput = document.getElementById('renameLineColorInput');
const renameLineColorSaveBtn = document.getElementById('renameLineColorSaveBtn');
const renameLineColorCancelBtn = document.getElementById('renameLineColorCancelBtn');
const minTrackLenRange = document.getElementById('minTrackLenRange');
const minTrackLenLabel = document.getElementById('minTrackLenLabel');
const viaductSpanRange = document.getElementById('viaductSpanRange');
const viaductSpanLabel = document.getElementById('viaductSpanLabel');
const viaductWallActionDrawBtn = document.getElementById('viaductWallActionDrawBtn');
const viaductWallActionEraseBtn = document.getElementById('viaductWallActionEraseBtn');
const viaductAreaModePaintBtn = document.getElementById('viaductAreaModePaintBtn');
const viaductAreaModeEraseBtn = document.getElementById('viaductAreaModeEraseBtn');
const viaductAreaShapeSelect = document.getElementById('viaductAreaShapeSelect');

const UNIT_LABEL = 'u';
const CLEARANCE_HALF_WIDTH_DOT = 2; // 2 units each side
const PAPER_COLOR = '#ffffff';
const ZOOM_BASELINE = 13.9; // Treat 1390% as 0% in status display.
const PLATFORM_WIDTH_DOT = 0.22;
const PLATFORM_MIN_LENGTH_DOT = 0.6;
const PLATFORM_INTERACT_RADIUS_DOT = 0.72;
const TRACK_BODY_ALPHA = 0.78;
const TRACK_ELEVATED_SIDE_COLOR = '#0f0f0f';
const TRACK_SIDE_OFFSET_DOT = 2;
const QUICK_SAVE_KEY = 'transitnexus.quickSave.v1';
const LAST_SELECTED_SAVE_KEY = 'transitnexus.lastSelectedSave.v1';
const LINE_COLOR_PRESETS_KEY = 'transitnexus.lineColorPresets.v1';
const TRACK_TOPOLOGY_SNAP_TOLERANCE = 0.35;
const TRACK_MAX_LEVEL = 4;
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
  viaductWalls: [],
  viaductAreas: [],
  platforms: [],
  trains: [],
  selection: null,
  draggingSelection: false,
  selectionMoved: false,
  lastDragWorld: null,
  mousePreview: null,
  draftingTrackStart: null,
  draftingTrackStartLevel: null,
  draftingViaductStart: null,
  draftingViaductCurrent: null,
  draftingViaductAreaStart: null,
  draftingViaductAreaCurrent: null,
  draftingViaductAreaPoints: [],
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
    trackGradient: 0,
    trackLineType: 'solid',
    trackColor: '#25698a',
    minTrackLength: 1,
    viaductSpan: 24,
    viaductWallAction: 'draw',
    viaductAreaMode: 'paint',
    viaductAreaShape: 'poly',
    viaductEditMode: 'wall'
  },
  layers: {
    grid: true,
    track: true,
    clearance: true,
    platform: true,
    train: true
  },
  lineColorPresets: [],
  selectedLineColorPresetIndex: -1,
  lineColorPanelOpen: false,
  lineColorEditorMode: null,
  lineColorPanelDrag: {
    dragging: false,
    offsetX: 0,
    offsetY: 0
  },
  history: [],
  future: []
};

const gpu = {
  enabled: false,
  gl: null,
  lineProgram: null,
  lineBuffer: null,
  linePosLoc: -1,
  lineColorLoc: -1,
  lineBaseLevelLoc: -1,
  lineResolutionLoc: null,
  lineMaskTexLoc: null,
  maskTexture: null
};

let gpuTrackVertices = [];
const gpuMaskCanvas = document.createElement('canvas');
const gpuMaskCtx = gpuMaskCanvas.getContext('2d', { alpha: false });
const gridTextureCanvas = document.createElement('canvas');
const gridTextureCtx = gridTextureCanvas.getContext('2d');
const gridTextureCache = {
  key: '',
  pattern: null
};

function encodeTrackLevelToMaskByte(level) {
  const lv = clamp(normalizeTrackLevel(level), 0, 255);
  return Math.round(lv);
}

function isGpuTrackRenderingEnabled() {
  return gpu.enabled && Boolean(gpu.gl);
}

function normalizeHexColorToRgb01(hex) {
  const norm = normalizeTrackColor(hex);
  const m = /^#?([0-9a-f]{6})$/i.exec(norm);
  if (!m) {
    return { r: 0.15, g: 0.41, b: 0.54 };
  }
  const raw = m[1];
  const v = Number.parseInt(raw, 16);
  return {
    r: ((v >> 16) & 0xff) / 255,
    g: ((v >> 8) & 0xff) / 255,
    b: (v & 0xff) / 255
  };
}

function resetGpuTrackVertices() {
  gpuTrackVertices = [];
}

function enqueueGpuTrackSegment(a, b, color, alpha, widthPx, baseLevelForMask = -128) {
  if (!isGpuTrackRenderingEnabled()) {
    return;
  }

  const sa = worldToScreen(a);
  const sb = worldToScreen(b);
  const dx = sb.x - sa.x;
  const dy = sb.y - sa.y;
  const segLen = Math.hypot(dx, dy);
  if (segLen < 1e-4) {
    return;
  }

  const halfW = Math.max(0.5, Number(widthPx) * 0.5);
  const nx = (-dy / segLen) * halfW;
  const ny = (dx / segLen) * halfW;
  const rgb = normalizeHexColorToRgb01(color);
  const aAlpha = clamp(Number(alpha), 0, 1);

  const p1x = sa.x + nx;
  const p1y = sa.y + ny;
  const p2x = sb.x + nx;
  const p2y = sb.y + ny;
  const p3x = sb.x - nx;
  const p3y = sb.y - ny;
  const p4x = sa.x - nx;
  const p4y = sa.y - ny;
  const baseLevel = Number(baseLevelForMask);

  // Two triangles per segment quad.
  gpuTrackVertices.push(p1x, p1y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
  gpuTrackVertices.push(p2x, p2y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
  gpuTrackVertices.push(p3x, p3y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
  gpuTrackVertices.push(p1x, p1y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
  gpuTrackVertices.push(p3x, p3y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
  gpuTrackVertices.push(p4x, p4y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
}

function enqueueGpuFilledCircle(center, radiusWorld, color, alpha, baseLevelForMask = -128) {
  if (!isGpuTrackRenderingEnabled()) {
    return;
  }

  const c = worldToScreen(center);
  const radiusPx = Math.max(0.5, Number(radiusWorld) * state.view.zoom);
  if (radiusPx < 1e-4) {
    return;
  }

  const rgb = normalizeHexColorToRgb01(color);
  const aAlpha = clamp(Number(alpha), 0, 1);
  const segCount = Math.max(10, Math.min(48, Math.ceil(radiusPx * 0.9)));
  const baseLevel = Number(baseLevelForMask);

  for (let i = 0; i < segCount; i += 1) {
    const a0 = (Math.PI * 2 * i) / segCount;
    const a1 = (Math.PI * 2 * (i + 1)) / segCount;
    const p1x = c.x + Math.cos(a0) * radiusPx;
    const p1y = c.y + Math.sin(a0) * radiusPx;
    const p2x = c.x + Math.cos(a1) * radiusPx;
    const p2y = c.y + Math.sin(a1) * radiusPx;

    gpuTrackVertices.push(c.x, c.y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
    gpuTrackVertices.push(p1x, p1y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
    gpuTrackVertices.push(p2x, p2y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
  }
}

function triangleAreaSign(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function isPointInTriangle2d(p, a, b, c) {
  const s1 = triangleAreaSign(a, b, p);
  const s2 = triangleAreaSign(b, c, p);
  const s3 = triangleAreaSign(c, a, p);
  const hasNeg = s1 < -1e-9 || s2 < -1e-9 || s3 < -1e-9;
  const hasPos = s1 > 1e-9 || s2 > 1e-9 || s3 > 1e-9;
  return !(hasNeg && hasPos);
}

function triangulateSimplePolygon(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return [];
  }

  const verts = points.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  const indices = verts.map((_, i) => i);
  const area = polygonArea(verts);
  const isCcw = area > 0;
  const triangles = [];
  let guard = 0;

  while (indices.length > 3 && guard < 4096) {
    guard += 1;
    let earFound = false;

    for (let i = 0; i < indices.length; i += 1) {
      const prevIdx = indices[(i - 1 + indices.length) % indices.length];
      const currIdx = indices[i];
      const nextIdx = indices[(i + 1) % indices.length];
      const a = verts[prevIdx];
      const b = verts[currIdx];
      const c = verts[nextIdx];
      const cross = triangleAreaSign(a, b, c);

      if (isCcw ? cross <= 1e-9 : cross >= -1e-9) {
        continue;
      }

      let hasInside = false;
      for (let j = 0; j < indices.length; j += 1) {
        const testIdx = indices[j];
        if (testIdx === prevIdx || testIdx === currIdx || testIdx === nextIdx) {
          continue;
        }
        if (isPointInTriangle2d(verts[testIdx], a, b, c)) {
          hasInside = true;
          break;
        }
      }
      if (hasInside) {
        continue;
      }

      triangles.push([a, b, c]);
      indices.splice(i, 1);
      earFound = true;
      break;
    }

    if (!earFound) {
      break;
    }
  }

  if (indices.length === 3) {
    triangles.push([verts[indices[0]], verts[indices[1]], verts[indices[2]]]);
  }

  if (triangles.length === 0 && verts.length >= 3) {
    for (let i = 1; i < verts.length - 1; i += 1) {
      triangles.push([verts[0], verts[i], verts[i + 1]]);
    }
  }

  return triangles;
}

function enqueueGpuPolygonFill(points, color, alpha, baseLevelForMask = -128) {
  if (!isGpuTrackRenderingEnabled()) {
    return;
  }

  const triangles = triangulateSimplePolygon(points);
  if (triangles.length === 0) {
    return;
  }

  const rgb = normalizeHexColorToRgb01(color);
  const aAlpha = clamp(Number(alpha), 0, 1);
  const baseLevel = Number(baseLevelForMask);

  for (const tri of triangles) {
    const s0 = worldToScreen(tri[0]);
    const s1 = worldToScreen(tri[1]);
    const s2 = worldToScreen(tri[2]);
    gpuTrackVertices.push(s0.x, s0.y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
    gpuTrackVertices.push(s1.x, s1.y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
    gpuTrackVertices.push(s2.x, s2.y, rgb.r, rgb.g, rgb.b, aAlpha, baseLevel);
  }
}

function enqueueGpuDashedLine(a, b, dashOnWorld, dashOffWorld, color, alpha, widthPx, baseLevelForMask = -128) {
  if (!isGpuTrackRenderingEnabled()) {
    return;
  }

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return;
  }

  const onLen = Math.max(1e-4, Number(dashOnWorld));
  const offLen = Math.max(0, Number(dashOffWorld));
  const stepLen = onLen + offLen;
  const ux = dx / len;
  const uy = dy / len;

  for (let cursor = 0; cursor < len - 1e-6; cursor += stepLen) {
    const s = cursor;
    const e = Math.min(len, cursor + onLen);
    if (e - s <= 1e-6) {
      continue;
    }
    const p0 = { x: a.x + ux * s, y: a.y + uy * s };
    const p1 = { x: a.x + ux * e, y: a.y + uy * e };
    enqueueGpuTrackSegment(p0, p1, color, alpha, widthPx, baseLevelForMask);
  }
}

function hasHigherViaductOverlapForCircle(center, radius, baseLevel) {
  const baseLv = normalizeTrackLevel(baseLevel);
  if (!Array.isArray(state.viaductAreas) || state.viaductAreas.length === 0) {
    return false;
  }

  const minX = center.x - radius;
  const maxX = center.x + radius;
  const minY = center.y - radius;
  const maxY = center.y + radius;
  let hasCandidate = false;

  for (const area of state.viaductAreas) {
    const areaLevel = normalizeTrackLevel(area.level);
    if (areaLevel <= 0 || areaLevel <= baseLv) {
      continue;
    }

    const poly = normalizeAreaPoints(area);
    if (poly.length < 3) {
      continue;
    }

    let polyMinX = Infinity;
    let polyMaxX = -Infinity;
    let polyMinY = Infinity;
    let polyMaxY = -Infinity;
    for (const p of poly) {
      if (p.x < polyMinX) {
        polyMinX = p.x;
      }
      if (p.x > polyMaxX) {
        polyMaxX = p.x;
      }
      if (p.y < polyMinY) {
        polyMinY = p.y;
      }
      if (p.y > polyMaxY) {
        polyMaxY = p.y;
      }
    }

    if (polyMaxX < minX || polyMinX > maxX || polyMaxY < minY || polyMinY > maxY) {
      continue;
    }

    hasCandidate = true;
    break;
  }

  if (!hasCandidate) {
    return false;
  }

  return estimateCircleHigherAreaCoverage(center, radius, baseLv) > 0.001;
}

function drawTrackJoinCircle(center, radius, baseLevel, color, alpha = TRACK_BODY_ALPHA) {
  if (isGpuTrackRenderingEnabled()) {
    enqueueGpuFilledCircle(center, radius, color, alpha, normalizeTrackLevel(baseLevel));
    return;
  }
  drawLevelAwareIntersectionCircle(center, radius, baseLevel, color, alpha);
}

function compileGpuShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initGpuTrackProgram(gl) {
  const vs = compileGpuShader(gl, gl.VERTEX_SHADER, `
attribute vec2 a_position;
attribute vec4 a_color;
attribute float a_baseLevel;
uniform vec2 u_resolution;
varying vec4 v_color;
varying float v_baseLevel;
void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  v_color = a_color;
  v_baseLevel = a_baseLevel;
}
`);
  const fs = compileGpuShader(gl, gl.FRAGMENT_SHADER, `
precision mediump float;
varying vec4 v_color;
varying float v_baseLevel;
uniform sampler2D u_maskTex;
uniform vec2 u_resolution;
void main() {
  if (v_baseLevel > -50.0) {
    vec2 uv = vec2(gl_FragCoord.x / u_resolution.x, 1.0 - (gl_FragCoord.y / u_resolution.y));
    float maskLevel = floor(texture2D(u_maskTex, uv).r * 255.0 + 0.5);
    if (maskLevel > v_baseLevel + 0.01 && maskLevel > 0.0) {
      discard;
    }
  }
  gl_FragColor = v_color;
}
`);
  if (!vs || !fs) {
    if (vs) {
      gl.deleteShader(vs);
    }
    if (fs) {
      gl.deleteShader(fs);
    }
    return false;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return false;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return false;
  }

  const lineBuffer = gl.createBuffer();
  if (!lineBuffer) {
    gl.deleteProgram(program);
    return false;
  }

  gpu.lineProgram = program;
  gpu.lineBuffer = lineBuffer;
  gpu.linePosLoc = gl.getAttribLocation(program, 'a_position');
  gpu.lineColorLoc = gl.getAttribLocation(program, 'a_color');
  gpu.lineBaseLevelLoc = gl.getAttribLocation(program, 'a_baseLevel');
  gpu.lineResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
  gpu.lineMaskTexLoc = gl.getUniformLocation(program, 'u_maskTex');
  const maskTexture = gl.createTexture();
  if (!maskTexture) {
    return false;
  }
  gpu.maskTexture = maskTexture;
  gl.bindTexture(gl.TEXTURE_2D, maskTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  return true;
}

function rebuildGpuMaskTexture() {
  const gl = gpu.gl;
  if (!isGpuTrackRenderingEnabled() || !gpu.maskTexture || !gpuMaskCtx) {
    return;
  }

  if (gpuMaskCanvas.width !== canvas.width) {
    gpuMaskCanvas.width = canvas.width;
  }
  if (gpuMaskCanvas.height !== canvas.height) {
    gpuMaskCanvas.height = canvas.height;
  }

  gpuMaskCtx.setTransform(1, 0, 0, 1, 0, 0);
  gpuMaskCtx.fillStyle = 'rgb(0,0,0)';
  gpuMaskCtx.fillRect(0, 0, gpuMaskCanvas.width, gpuMaskCanvas.height);

  if (Array.isArray(state.viaductAreas) && state.viaductAreas.length > 0) {
    const sortedAreas = state.viaductAreas
      .map((area) => ({ area, lv: normalizeTrackLevel(area.level) }))
      .filter((item) => item.lv > 0)
      .sort((a, b) => a.lv - b.lv);

    for (const item of sortedAreas) {
      const poly = normalizeAreaPoints(item.area);
      if (poly.length < 3) {
        continue;
      }
      const levelByte = encodeTrackLevelToMaskByte(item.lv);
      gpuMaskCtx.fillStyle = `rgb(${levelByte},0,0)`;
      const first = worldToScreen(poly[0]);
      gpuMaskCtx.beginPath();
      gpuMaskCtx.moveTo(first.x, first.y);
      for (let i = 1; i < poly.length; i += 1) {
        const p = worldToScreen(poly[i]);
        gpuMaskCtx.lineTo(p.x, p.y);
      }
      gpuMaskCtx.closePath();
      gpuMaskCtx.fill();
    }
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpu.maskTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gpuMaskCanvas);
}

function drawGpuTrackSegments() {
  const gl = gpu.gl;
  if (!gpu.enabled || !gl) {
    return;
  }

  gl.viewport(0, 0, gpuCanvas.width, gpuCanvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (!gpu.lineProgram || !gpu.lineBuffer || gpuTrackVertices.length === 0) {
    return;
  }

  const vertices = new Float32Array(gpuTrackVertices);
  gl.useProgram(gpu.lineProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpu.maskTexture);
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  const stride = 7 * Float32Array.BYTES_PER_ELEMENT;
  gl.enableVertexAttribArray(gpu.linePosLoc);
  gl.vertexAttribPointer(gpu.linePosLoc, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(gpu.lineColorLoc);
  gl.vertexAttribPointer(gpu.lineColorLoc, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
  gl.enableVertexAttribArray(gpu.lineBaseLevelLoc);
  gl.vertexAttribPointer(gpu.lineBaseLevelLoc, 1, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
  gl.uniform2f(gpu.lineResolutionLoc, gpuCanvas.width, gpuCanvas.height);
  gl.uniform1i(gpu.lineMaskTexLoc, 0);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 7);
}

function syncGpuCanvasSize() {
  if (!gpuCanvas || !canvas) {
    return;
  }
  if (gpuCanvas.width !== canvas.width) {
    gpuCanvas.width = canvas.width;
  }
  if (gpuCanvas.height !== canvas.height) {
    gpuCanvas.height = canvas.height;
  }
  if (gpuMaskCanvas.width !== canvas.width) {
    gpuMaskCanvas.width = canvas.width;
  }
  if (gpuMaskCanvas.height !== canvas.height) {
    gpuMaskCanvas.height = canvas.height;
  }
}

function initGpuLayer() {
  if (!gpuCanvas) {
    return;
  }

  syncGpuCanvasSize();
  const gl = gpuCanvas.getContext('webgl2', {
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false
  }) || gpuCanvas.getContext('webgl', {
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false
  });

  if (!gl) {
    gpu.enabled = false;
    gpu.gl = null;
    return;
  }

  if (!initGpuTrackProgram(gl)) {
    gpu.enabled = false;
    gpu.gl = null;
    return;
  }

  gpu.enabled = true;
  gpu.gl = gl;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.viewport(0, 0, gpuCanvas.width, gpuCanvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function normalizeLineColorPresets(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  const next = [];
  const used = new Set();
  for (const item of list) {
    const name = String(item?.name || '').trim();
    const color = normalizeTrackColor(item?.color);
    if (!name || name.length > 24) {
      continue;
    }
    const key = `${name.toLowerCase()}|${color.toLowerCase()}`;
    if (used.has(key)) {
      continue;
    }
    used.add(key);
    next.push({ name, color });
    if (next.length >= 30) {
      break;
    }
  }
  return next;
}

function saveLineColorPresetsToLocal() {
  try {
    localStorage.setItem(LINE_COLOR_PRESETS_KEY, JSON.stringify(state.lineColorPresets));
  } catch (_err) {
    // Ignore storage failures silently.
  }
}

function syncSelectedLineColorPresetIndex() {
  if (!Array.isArray(state.lineColorPresets) || state.lineColorPresets.length === 0) {
    state.selectedLineColorPresetIndex = -1;
    state.lineColorEditorMode = null;
    return;
  }
  if (state.selectedLineColorPresetIndex < 0 || state.selectedLineColorPresetIndex >= state.lineColorPresets.length) {
    state.selectedLineColorPresetIndex = 0;
  }
}

function loadLineColorPresetsFromLocal() {
  try {
    const raw = localStorage.getItem(LINE_COLOR_PRESETS_KEY);
    if (!raw) {
      state.lineColorPresets = [];
      syncSelectedLineColorPresetIndex();
      return;
    }
    state.lineColorPresets = normalizeLineColorPresets(JSON.parse(raw));
    syncSelectedLineColorPresetIndex();
  } catch (_err) {
    state.lineColorPresets = [];
    syncSelectedLineColorPresetIndex();
  }
}

function applyCurrentTrackColor(color, options = {}) {
  const nextColor = normalizeTrackColor(color);
  state.settings.trackColor = nextColor;
  if (trackColorInput) {
    trackColorInput.value = nextColor;
  }

  const applied = applyTrackSettingsToSelection();
  if (applied && options.commit === true) {
    commitHistory();
  }
  render();
}

function renderLineColorPresetList() {
  if (!savedLineColorList || !savedLineColorActions || !renameLineColorEditor || !lineColorPanel) {
    return;
  }

  // DOM hidden is the source of truth for panel visibility.
  state.lineColorPanelOpen = !lineColorPanel.hidden;
  syncSelectedLineColorPresetIndex();
  if (!state.lineColorPanelOpen) {
    return;
  }

  savedLineColorActions.hidden = false;
  savedLineColorList.innerHTML = '';
  const hasPresets = Array.isArray(state.lineColorPresets) && state.lineColorPresets.length > 0;
  savedLineColorList.hidden = !hasPresets;
  renameLineColorEditor.hidden = state.lineColorEditorMode === null;
  if (renameLineColorBtn) {
    renameLineColorBtn.disabled = !hasPresets;
  }
  if (deleteLineColorBtn) {
    deleteLineColorBtn.disabled = !hasPresets;
  }

  for (let i = 0; i < state.lineColorPresets.length; i += 1) {
    const preset = state.lineColorPresets[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'saved-line-color-item';
    if (i === state.selectedLineColorPresetIndex) {
      btn.classList.add('active');
    }
    btn.title = `${preset.name} (${preset.color})`;

    const dot = document.createElement('span');
    dot.className = 'saved-line-color-dot';
    dot.style.backgroundColor = preset.color;

    const text = document.createElement('span');
    text.textContent = preset.name;

    btn.appendChild(dot);
    btn.appendChild(text);
    btn.addEventListener('click', () => {
      state.selectedLineColorPresetIndex = i;
      state.lineColorEditorMode = null;
      applyCurrentTrackColor(preset.color, { commit: true });
      renderLineColorPresetList();
    });
    savedLineColorList.appendChild(btn);
  }

  if (state.lineColorEditorMode && renameLineColorInput) {
    if (state.lineColorEditorMode === 'rename') {
      const current = state.lineColorPresets[state.selectedLineColorPresetIndex];
      renameLineColorInput.placeholder = '新しい名前';
      renameLineColorInput.value = current ? current.name : '';
    } else {
      renameLineColorInput.placeholder = '保存名';
      renameLineColorInput.value = '';
    }
    renameLineColorInput.focus();
    renameLineColorInput.select();
  }
}

function saveCurrentLineColorPreset() {
  if (!renameLineColorInput) {
    return;
  }

  const currentColor = normalizeTrackColor(state.settings.trackColor);
  const name = renameLineColorInput.value.trim();
  if (!name) {
    return;
  }

  const next = Array.isArray(state.lineColorPresets) ? [...state.lineColorPresets] : [];
  const existingByName = next.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  if (existingByName >= 0) {
    next[existingByName] = { name, color: currentColor };
  } else {
    next.push({ name, color: currentColor });
  }

  state.lineColorPresets = normalizeLineColorPresets(next);
  state.selectedLineColorPresetIndex = state.lineColorPresets.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  state.lineColorEditorMode = null;
  saveLineColorPresetsToLocal();
  renderLineColorPresetList();
}

function renameSelectedLineColorPreset() {
  syncSelectedLineColorPresetIndex();
  const idx = state.selectedLineColorPresetIndex;
  if (idx < 0 || idx >= state.lineColorPresets.length || !renameLineColorInput) {
    return;
  }

  const nextName = renameLineColorInput.value.trim();
  if (!nextName) {
    return;
  }

  const duplicated = state.lineColorPresets.findIndex(
    (p, i) => i !== idx && p.name.toLowerCase() === nextName.toLowerCase()
  );
  if (duplicated >= 0) {
    return;
  }

  const current = state.lineColorPresets[idx];
  const ok = window.confirm(`保存カラー「${current.name}」を「${nextName}」に変更しますか？`);
  if (!ok) {
    return;
  }

  state.lineColorPresets[idx] = {
    ...state.lineColorPresets[idx],
    name: nextName
  };
  state.lineColorPresets = normalizeLineColorPresets(state.lineColorPresets);
  state.selectedLineColorPresetIndex = state.lineColorPresets.findIndex((p) => p.name.toLowerCase() === nextName.toLowerCase());
  state.lineColorEditorMode = null;
  saveLineColorPresetsToLocal();
  renderLineColorPresetList();
}

function deleteSelectedLineColorPreset() {
  syncSelectedLineColorPresetIndex();
  const idx = state.selectedLineColorPresetIndex;
  if (idx < 0 || idx >= state.lineColorPresets.length) {
    return;
  }

  const target = state.lineColorPresets[idx];
  const ok = window.confirm(`保存カラー「${target.name}」を削除しますか？`);
  if (!ok) {
    return;
  }

  state.lineColorPresets.splice(idx, 1);
  if (state.selectedLineColorPresetIndex >= state.lineColorPresets.length) {
    state.selectedLineColorPresetIndex = state.lineColorPresets.length - 1;
  }
  if (state.lineColorPresets.length === 0) {
    state.selectedLineColorPresetIndex = -1;
  }
  state.lineColorEditorMode = null;
  saveLineColorPresetsToLocal();
  renderLineColorPresetList();
}

function isLineColorPanelActive() {
  if (!lineColorPanel || lineColorPanel.hidden) {
    return false;
  }
  const active = document.activeElement;
  return active === toggleLineColorPanelBtn || lineColorPanel.contains(active);
}

function setLineColorPanelOpen(open) {
  if (!lineColorPanel) {
    state.lineColorPanelOpen = false;
    return;
  }
  state.lineColorPanelOpen = Boolean(open);
  lineColorPanel.hidden = !state.lineColorPanelOpen;
  if (!state.lineColorPanelOpen) {
    state.lineColorEditorMode = null;
    endLineColorPanelDrag();
  }
}

function clampLineColorPanelPosition(left, top) {
  if (!lineColorPanel) {
    return { left, top };
  }
  const rect = lineColorPanel.getBoundingClientRect();
  const maxLeft = Math.max(0, window.innerWidth - rect.width);
  const maxTop = Math.max(0, window.innerHeight - rect.height);
  return {
    left: clamp(left, 0, maxLeft),
    top: clamp(top, 0, maxTop)
  };
}

function beginLineColorPanelDrag(clientX, clientY) {
  if (!lineColorPanel || lineColorPanel.hidden) {
    return;
  }
  const rect = lineColorPanel.getBoundingClientRect();
  lineColorPanel.style.right = 'auto';
  lineColorPanel.style.left = `${rect.left}px`;
  lineColorPanel.style.top = `${rect.top}px`;

  state.lineColorPanelDrag.dragging = true;
  state.lineColorPanelDrag.offsetX = clientX - rect.left;
  state.lineColorPanelDrag.offsetY = clientY - rect.top;
}

function shouldStartLineColorPanelDrag(target) {
  if (!target) {
    return false;
  }
  const interactiveSelector = 'button, input, select, textarea, a, label';
  return !target.closest(interactiveSelector);
}

function updateLineColorPanelDrag(clientX, clientY) {
  if (!lineColorPanel || !state.lineColorPanelDrag.dragging) {
    return;
  }
  const rawLeft = clientX - state.lineColorPanelDrag.offsetX;
  const rawTop = clientY - state.lineColorPanelDrag.offsetY;
  const pos = clampLineColorPanelPosition(rawLeft, rawTop);
  lineColorPanel.style.left = `${pos.left}px`;
  lineColorPanel.style.top = `${pos.top}px`;
}

function endLineColorPanelDrag() {
  state.lineColorPanelDrag.dragging = false;
}

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
    viaductWalls: clone(state.viaductWalls),
    viaductAreas: clone(state.viaductAreas),
    platforms: clone(state.platforms),
    trains: clone(state.trains)
  };
}

function snapshotsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applySnapshot(snap) {
  state.tracks = clone(snap.tracks || []);
  state.viaductWalls = clone(snap.viaductWalls || []);
  state.viaductAreas = clone(snap.viaductAreas || []);
  state.platforms = clone(snap.platforms || []);
  state.trains = clone(snap.trains || []);
  state.selection = null;
  state.draggingSelection = false;
  state.selectionMoved = false;
  state.lastDragWorld = null;
  state.draftingTrackStart = null;
  state.draftingTrackStartLevel = null;
  state.draftingViaductStart = null;
  state.draftingViaductCurrent = null;
  state.draftingViaductAreaStart = null;
  state.draftingViaductAreaCurrent = null;
  state.draftingViaductAreaPoints = [];
  state.draftingPlatformStart = null;
  state.draftingPlatformCurrent = null;
  render();
}

function buildSerializableState() {
  const serializableViaductWalls = state.viaductWalls
    .filter((seg) => seg && seg.a && seg.b)
    .map((seg) => ({
      a: { x: Number(seg.a.x) || 0, y: Number(seg.a.y) || 0 },
      b: { x: Number(seg.b.x) || 0, y: Number(seg.b.y) || 0 },
      level: normalizeTrackLevel(seg.level),
      origin: seg.origin === 'manual' ? 'manual' : undefined
    }));

  return {
    version: 11,
    unitSystem: UNIT_LABEL,
    savedAt: new Date().toISOString(),
    tracks: clone(state.tracks),
    viaductWalls: serializableViaductWalls,
    viaductAreas: clone(state.viaductAreas),
    platforms: clone(state.platforms),
    trains: clone(state.trains),
    settings: {
      gridSize: state.settings.gridSize,
      snap: state.settings.snap,
      ortho: state.settings.ortho,
      trackWidth: state.settings.trackWidth,
      trackLevel: state.settings.trackLevel,
      trackGradient: state.settings.trackGradient,
      trackLineType: state.settings.trackLineType,
      trackColor: state.settings.trackColor,
      lineColor: state.settings.trackColor,
      minTrackLength: state.settings.minTrackLength,
      viaductSpan: state.settings.viaductSpan,
      viaductWallAction: state.settings.viaductWallAction,
      viaductAreaMode: state.settings.viaductAreaMode,
      viaductAreaShape: state.settings.viaductAreaShape,
      viaductEditMode: state.settings.viaductEditMode
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
    level: normalizeTrackLevel(seg.levelStart ?? seg.level),
    levelStart: normalizeTrackLevel(seg.levelStart ?? seg.level),
    levelEnd: normalizeTrackLevel(seg.levelEnd ?? seg.level),
    lineType: normalizeTrackLineType(seg.lineType),
    color: normalizeTrackColor(seg.color),
    sideDisabledPositive: seg.sideDisabledPositive === true,
    sideDisabledNegative: seg.sideDisabledNegative === true
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

function pointsNear(a, b, tolerance = 0.06) {
  return distance(a, b) <= tolerance;
}

function segmentsNear(a1, b1, a2, b2, tolerance = 0.06) {
  const same = pointsNear(a1, a2, tolerance) && pointsNear(b1, b2, tolerance);
  const reversed = pointsNear(a1, b2, tolerance) && pointsNear(b1, a2, tolerance);
  return same || reversed;
}

function isAutoGeneratedTrackSideWall(wall, tracks) {
  if (!wall || !wall.a || !wall.b || !Array.isArray(tracks) || tracks.length === 0) {
    return false;
  }

  for (const seg of tracks) {
    const offset = getTrackSideOffset(seg);
    if (offset <= 0) {
      continue;
    }

    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      continue;
    }

    const nx = -dy / len;
    const ny = dx / len;

    const posA = { x: seg.a.x + nx * offset, y: seg.a.y + ny * offset };
    const posB = { x: seg.b.x + nx * offset, y: seg.b.y + ny * offset };
    if (segmentsNear(wall.a, wall.b, posA, posB)) {
      return true;
    }

    const negA = { x: seg.a.x - nx * offset, y: seg.a.y - ny * offset };
    const negB = { x: seg.b.x - nx * offset, y: seg.b.y - ny * offset };
    if (segmentsNear(wall.a, wall.b, negA, negB)) {
      return true;
    }
  }

  return false;
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
        level: normalizeTrackLevel(seg.levelStart ?? seg.level),
        levelStart: normalizeTrackLevel(seg.levelStart ?? seg.level),
        levelEnd: normalizeTrackLevel(seg.levelEnd ?? seg.level),
        lineType: normalizeTrackLineType(seg.lineType),
        color: normalizeTrackColor(seg.color ?? seg.trackColor ?? seg.lineColor),
        sideDisabledPositive: seg.sideDisabledPositive === true,
        sideDisabledNegative: seg.sideDisabledNegative === true
      }))
    : [];
  const topologyNormalizedTracks = normalizeLoadedTrackTopology(normalizedTracks);
  const normalizedViaductWalls = Array.isArray(safe.viaductWalls)
    ? safe.viaductWalls
      .filter((seg) => seg && seg.a && seg.b)
      .map((seg) => ({
        a: { x: Number(seg.a.x) || 0, y: Number(seg.a.y) || 0 },
        b: { x: Number(seg.b.x) || 0, y: Number(seg.b.y) || 0 },
        level: normalizeTrackLevel(seg.level),
        origin: seg.origin === 'manual' ? 'manual' : undefined
      }))
    : [];
  const normalizedViaductAreas = Array.isArray(safe.viaductAreas)
    ? safe.viaductAreas
      .map((area) => {
        const level = normalizeTrackLevel(area?.level ?? area?.lv ?? area?.trackLevel);
        if (area && Array.isArray(area.points) && area.points.length >= 3) {
          return {
            level,
            points: area.points
              .filter((p) => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)))
              .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
          };
        }
        if (area && Array.isArray(area.polygon) && area.polygon.length >= 3) {
          return {
            level,
            points: area.polygon
              .map((p) => {
                if (Array.isArray(p) && p.length >= 2) {
                  return { x: Number(p[0]), y: Number(p[1]) };
                }
                if (p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))) {
                  return { x: Number(p.x), y: Number(p.y) };
                }
                return null;
              })
              .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
          };
        }
        if (area && area.a && area.b) {
          const x1 = Number(area.a.x) || 0;
          const y1 = Number(area.a.y) || 0;
          const x2 = Number(area.b.x) || 0;
          const y2 = Number(area.b.y) || 0;
          return {
            level,
            points: [
              { x: Math.min(x1, x2), y: Math.min(y1, y2) },
              { x: Math.max(x1, x2), y: Math.min(y1, y2) },
              { x: Math.max(x1, x2), y: Math.max(y1, y2) },
              { x: Math.min(x1, x2), y: Math.max(y1, y2) }
            ]
          };
        }
        return null;
      })
      .filter((area) => area && Array.isArray(area.points) && area.points.length >= 3)
    : [];
  const normalizedPlatforms = Array.isArray(safe.platforms)
    ? safe.platforms
      .map((p) => {
        if (p && p.a && p.b) {
          return {
            a: { x: Number(p.a.x) || 0, y: Number(p.a.y) || 0 },
            b: { x: Number(p.b.x) || 0, y: Number(p.b.y) || 0 },
            level: normalizeTrackLevel(p.level)
          };
        }

        if (p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))
          && Number.isFinite(Number(p.w)) && Number.isFinite(Number(p.h))) {
          return {
            x: Number(p.x) || 0,
            y: Number(p.y) || 0,
            w: Number(p.w) || 0,
            h: Number(p.h) || 0,
            level: normalizeTrackLevel(p.level)
          };
        }

        return null;
      })
      .filter((p) => p)
    : [];
  return {
    tracks: topologyNormalizedTracks,
    viaductWalls: normalizedViaductWalls,
    viaductAreas: normalizedViaductAreas,
    platforms: normalizedPlatforms,
    trains: Array.isArray(safe.trains)
      ? safe.trains
        .filter((tr) => tr && Number.isFinite(Number(tr.x)) && Number.isFinite(Number(tr.y)))
        .map((tr) => ({
          x: Number(tr.x) || 0,
          y: Number(tr.y) || 0,
          angle: Number.isFinite(Number(tr.angle)) ? Number(tr.angle) : 0,
          cars: clamp(Math.round(Number(tr.cars) || 4), 1, 10),
          level: normalizeTrackLevel(tr.level)
        }))
      : [],
    settings: {
      gridSize: Number(safe.settings?.gridSize) || state.settings.gridSize,
      snap: typeof safe.settings?.snap === 'boolean' ? safe.settings.snap : state.settings.snap,
      ortho: typeof safe.settings?.ortho === 'boolean' ? safe.settings.ortho : state.settings.ortho,
      trackWidth: Number(safe.settings?.trackWidth) || state.settings.trackWidth,
      trackLevel: normalizeTrackLevel(safe.settings?.trackLevel),
      trackGradient: normalizeTrackGradient(safe.settings?.trackGradient),
      trackLineType: normalizeTrackLineType(safe.settings?.trackLineType),
      trackColor: normalizeTrackColor(safe.settings?.trackColor ?? safe.settings?.lineColor),
      minTrackLength: migratedMinTrackLength,
      viaductSpan: clamp(Number(safe.settings?.viaductSpan) || state.settings.viaductSpan, 4, 80),
      viaductWallAction: safe.settings?.viaductWallAction === 'erase' ? 'erase' : 'draw',
      viaductAreaMode: safe.settings?.viaductAreaMode === 'erase' ? 'erase' : 'paint',
      viaductAreaShape: 'poly',
      viaductEditMode: safe.settings?.viaductEditMode === 'area' ? 'area' : 'wall'
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
  state.viaductWalls = clone(next.viaductWalls);
  state.viaductAreas = clone(next.viaductAreas);
  state.platforms = clone(next.platforms);
  state.trains = clone(next.trains);

  state.settings.gridSize = clamp(next.settings.gridSize, 1, 5);
  state.settings.snap = next.settings.snap;
  state.settings.ortho = next.settings.ortho;
  state.settings.trackWidth = clamp(next.settings.trackWidth, 1, 8);
  state.settings.trackLevel = next.settings.trackLevel;
  state.settings.trackGradient = next.settings.trackGradient;
  state.settings.trackLineType = next.settings.trackLineType;
  state.settings.trackColor = next.settings.trackColor;
  state.settings.minTrackLength = clamp(next.settings.minTrackLength, 1, 20);
  state.settings.viaductSpan = clamp(next.settings.viaductSpan, 4, 80);
  state.settings.viaductWallAction = next.settings.viaductWallAction;
  state.settings.viaductAreaMode = next.settings.viaductAreaMode;
  state.settings.viaductAreaShape = next.settings.viaductAreaShape;
  state.settings.viaductEditMode = next.settings.viaductEditMode;

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
  state.draftingTrackStartLevel = null;
  state.draftingViaductStart = null;
  state.draftingViaductCurrent = null;
  state.draftingViaductAreaStart = null;
  state.draftingViaductAreaCurrent = null;
  state.draftingViaductAreaPoints = [];
  state.draftingPlatformStart = null;
  state.draftingPlatformCurrent = null;

  gridSizeSelect.value = String(state.settings.gridSize);
  snapToggle.checked = state.settings.snap;
  orthoToggle.checked = state.settings.ortho;
  trackWidthRange.value = String(Math.round(state.settings.trackWidth));
  minTrackLenRange.value = String(state.settings.minTrackLength);
  if (viaductSpanRange) {
    viaductSpanRange.value = String(Math.round(state.settings.viaductSpan));
  }
  if (trackGradientSelect) {
    trackGradientSelect.value = String(state.settings.trackGradient);
  }
  if (trackLineTypeSelect) {
    trackLineTypeSelect.value = state.settings.trackLineType;
  }
  if (trackColorInput) {
    trackColorInput.value = normalizeTrackColor(state.settings.trackColor);
  }
  syncViaductActionButtons();
  if (viaductAreaShapeSelect) {
    viaductAreaShapeSelect.value = state.settings.viaductAreaShape;
  }

  mergeViaductAreaRectangles();
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
  state.draftingTrackStartLevel = null;
  state.draftingViaductStart = null;
  state.draftingViaductCurrent = null;
  state.draftingViaductAreaStart = null;
  state.draftingViaductAreaCurrent = null;
  state.draftingViaductAreaPoints = [];
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
  state.viaductWalls = [];
  state.viaductAreas = [];
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
  state.settings.trackGradient = 0;
  state.settings.trackLineType = 'solid';
  state.settings.trackColor = '#25698a';
  state.settings.minTrackLength = 1;
  state.settings.viaductSpan = 24;
  state.settings.viaductWallAction = 'draw';
  state.settings.viaductAreaMode = 'paint';
  state.settings.viaductAreaShape = 'poly';
  state.settings.viaductEditMode = 'wall';

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
  if (trackGradientSelect) {
    trackGradientSelect.value = '0';
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
  if (viaductSpanRange) {
    viaductSpanRange.value = '24';
  }
  syncViaductActionButtons();
  if (viaductAreaShapeSelect) {
    viaductAreaShapeSelect.value = 'poly';
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

function syncViaductActionButtons() {
  if (viaductWallActionDrawBtn && viaductWallActionEraseBtn) {
    const drawActive = state.settings.viaductWallAction !== 'erase';
    viaductWallActionDrawBtn.classList.toggle('active', drawActive);
    viaductWallActionEraseBtn.classList.toggle('active', !drawActive);
  }

  if (viaductAreaModePaintBtn && viaductAreaModeEraseBtn) {
    const paintActive = state.settings.viaductAreaMode !== 'erase';
    viaductAreaModePaintBtn.classList.toggle('active', paintActive);
    viaductAreaModeEraseBtn.classList.toggle('active', !paintActive);
  }
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

function resolveViaductAreaPoint(rawPoint) {
  if (state.settings.viaductAreaShape === 'poly') {
    return quantizePoint(rawPoint);
  }
  return applyTrackConstraint(rawPoint, state.draftingViaductAreaStart);
}

function setMode(mode) {
  if (mode === 'viaduct') {
    state.settings.viaductEditMode = 'wall';
  }
  if (mode === 'viaduct-area') {
    state.settings.viaductEditMode = 'area';
  }

  state.mode = mode;
  state.draftingTrackStart = null;
  state.draftingTrackStartLevel = null;
  state.draftingViaductStart = null;
  state.draftingViaductCurrent = null;
  state.draftingViaductAreaStart = null;
  state.draftingViaductAreaCurrent = null;
  state.draftingViaductAreaPoints = [];
  state.draftingPlatformStart = null;
  state.draftingPlatformCurrent = null;
  state.draggingSelection = false;
  state.selectionMoved = false;
  state.lastDragWorld = null;

  for (const btn of modeButtons) {
    const isViaductFamily = mode === 'viaduct' || mode === 'viaduct-area';
    const active = btn.dataset.mode === mode || (btn.dataset.mode === 'viaduct' && isViaductFamily);
    btn.classList.toggle('active', active);
  }

  const hints = {
    select: '選択: クリックで選択、ドラッグで移動、Deleteで削除',
    available: 'アベイラブル: 全レベル表示（重なり/くぐりを反映）',
    track: '線路: 始点クリック → 終点クリックで敷設',
    viaduct: '高架外側線: 2クリックで外側線を追加（同レベル同士で面が自動補助）',
    'viaduct-area': '高架エリア: Paint/Eraseと形状を選び、範囲を確定',
    platform: 'ホーム: 2クリックで敷設（終点から連続入力）',
    train: '列車: 線路付近をクリックして配置',
    car: '増結: 列車をクリックして車両追加',
    erase: '削除: 対象をクリックして削除'
  };
  hint.textContent = hints[mode];
  updateModeGuide(mode);
  updateModeSettingVisibility(mode);
  updateViaductEditSwitch(mode);
  render();
}

function updateViaductEditSwitch(mode) {
  if (!viaductEditSwitch || !viaductWallEditBtn || !viaductAreaEditBtn) {
    return;
  }
  const visible = mode === 'viaduct' || mode === 'viaduct-area';
  viaductEditSwitch.hidden = !visible;
  if (!visible) {
    return;
  }
  viaductWallEditBtn.classList.toggle('active', mode === 'viaduct');
  viaductAreaEditBtn.classList.toggle('active', mode === 'viaduct-area');
}

function getModeDisplayName(mode) {
  const names = {
    select: '選択',
    available: 'アベイラブル',
    track: '線路',
    viaduct: '高架外側線',
    'viaduct-area': '高架エリア',
    platform: 'プラットホーム',
    train: '列車',
    car: '増結',
    erase: '削除'
  };
  return names[mode] || mode;
}

function updateModeGuide(mode) {
  if (modeLabel) {
    modeLabel.textContent = `現在モード: ${getModeDisplayName(mode)}`;
  }
  if (!modeSteps) {
    return;
  }

  const stepsMap = {
    available: [
      '全レベルを同時表示',
      '重なり/くぐり表現を反映',
      'ツール選択で編集モードに戻る'
    ],
    viaduct: [
      `操作: ${state.settings.viaductWallAction === 'erase' ? '削除（選択→Delete）' : '追加（2クリック）'}`,
      state.settings.viaductWallAction === 'erase' ? '外側線をクリックで選択' : '始点をクリック → 終点をクリックで確定',
      state.settings.viaductWallAction === 'erase' ? 'Deleteキーで削除、Escで選択解除' : '続けてクリックで連続作図、Escで解除'
    ],
    'viaduct-area': [
      `種別: ${state.settings.viaductAreaMode === 'erase' ? 'Erase(削除範囲)' : 'Paint(追加範囲)'}`,
      '点をクリックして境界線を作図（3点以上）',
      state.settings.viaductAreaMode === 'erase'
        ? '始点クリック or Enterで確定（内包エリアを削除）、右クリック/Ctrl+Zで1頂点戻す'
        : '始点クリック or Enterで確定（範囲を追加）、右クリック/Ctrl+Zで1頂点戻す'
    ],
    track: [
      '始点クリック',
      '終点クリックで確定',
      'Altで一時スナップ解除'
    ],
    platform: [
      '始点クリック',
      '終点クリックで確定',
      '終点から連続入力'
    ],
    select: [
      '対象をクリックで選択',
      'ドラッグで移動',
      'Deleteで削除'
    ]
  };

  const steps = stepsMap[mode] || ['操作対象をクリックして実行'];
  modeSteps.innerHTML = '';
  for (const line of steps) {
    const li = document.createElement('li');
    li.textContent = line;
    modeSteps.appendChild(li);
  }
}

function updateModeSettingVisibility(mode) {
  for (const label of modeSettingGroups) {
    const group = label.dataset.settingGroup;
    let visible = true;
    if (group === 'viaduct-wall') {
      visible = mode === 'viaduct';
    }
    if (group === 'viaduct-area') {
      visible = mode === 'viaduct-area';
    }
    label.classList.toggle('setting-hidden', !visible);
  }
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
      best = { ...pr, seg };
    }
  }
  return best;
}

function endpointKey(p) {
  return `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
}

function trackNodeKey(p, level) {
  return `${endpointKey(p)}@${normalizeTrackLevel(level)}`;
}

function platformNodeKey(p) {
  const mergeStep = 0.3;
  const x = Math.round(p.x / mergeStep);
  const y = Math.round(p.y / mergeStep);
  return `${x},${y}`;
}

function getViaductWallNodes(level = getActiveTrackLevel()) {
  const nodes = new Map();
  const lv = normalizeTrackLevel(level);
  for (const wall of state.viaductWalls) {
    if (normalizeTrackLevel(wall.level) !== lv) {
      continue;
    }
    nodes.set(endpointKey(wall.a), wall.a);
    nodes.set(endpointKey(wall.b), wall.b);
  }
  return Array.from(nodes.values());
}

function findNearestViaductWallNode(point, snapStrength = 'normal', level = getActiveTrackLevel()) {
  const nodes = getViaductWallNodes(level);
  if (nodes.length === 0) {
    return null;
  }

  const baseRadiusPx = snapStrength === 'light' ? 6 : 9;
  const snapRadiusWorld = clamp(baseRadiusPx / Math.max(0.0001, state.view.zoom), 0.16, 0.6);
  let best = null;
  for (const node of nodes) {
    const d = distance(point, node);
    if (d <= snapRadiusWorld && (!best || d < best.dist)) {
      best = { x: node.x, y: node.y, dist: d };
    }
  }
  return best;
}

function findNearestViaductWallProjection(point, options = {}) {
  const {
    level = getActiveTrackLevel(),
    allowAnyLevel = false,
    snapRadiusPx = 7
  } = options;
  const lv = normalizeTrackLevel(level);
  const snapRadius = clamp(snapRadiusPx / Math.max(0.0001, state.view.zoom), 0.2, 3.5);
  let best = null;

  for (let i = 0; i < state.viaductWalls.length; i += 1) {
    const wall = state.viaductWalls[i];
    const wallLevel = normalizeTrackLevel(wall.level);
    if (!allowAnyLevel && wallLevel !== lv) {
      continue;
    }
    const pr = nearestPointOnSegment(point, wall.a, wall.b);
    if (pr.dist > snapRadius) {
      continue;
    }
    const score = pr.dist + (allowAnyLevel && wallLevel !== lv ? 0.02 : 0);
    if (!best || score < best.score) {
      best = { index: i, score, wallLevel, ...pr };
    }
  }

  return best;
}

function findNearestTrackSideProjection(point, options = {}) {
  const {
    level = getActiveTrackLevel(),
    allowAnyLevel = false,
    snapRadiusPx = 22
  } = options;

  const lv = normalizeTrackLevel(level);
  const snapRadius = clamp(snapRadiusPx / Math.max(0.0001, state.view.zoom), 0.2, 3.5);
  let best = null;

  for (let i = 0; i < state.tracks.length; i += 1) {
    const seg = state.tracks[i];
    const tier = getTrackElevatedTier(seg);
    if (tier < 1) {
      continue;
    }

    const aLv = getTrackEndpointLevel(seg, 'a');
    const bLv = getTrackEndpointLevel(seg, 'b');
    const segTopLevel = Math.max(aLv, bLv);
    if (!allowAnyLevel && segTopLevel !== lv) {
      continue;
    }

    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      continue;
    }

    const nx = -dy / len;
    const ny = dx / len;
    const offset = getTrackSideOffset(seg);

    const consider = (side, enabled, targetOffset) => {
      if (!enabled) {
        return;
      }
      const sa = { x: seg.a.x + nx * targetOffset, y: seg.a.y + ny * targetOffset };
      const sb = { x: seg.b.x + nx * targetOffset, y: seg.b.y + ny * targetOffset };
      const dist = nearestPointOnSegment(point, sa, sb).dist;
      if (dist > snapRadius) {
        return;
      }
      const score = dist + (allowAnyLevel && segTopLevel !== lv ? 0.02 : 0);
      if (!best || score < best.score) {
        best = { type: 'track-side', index: i, side, score, dist };
      }
    };

    consider('positive', seg.sideDisabledPositive !== true, offset);
    consider('negative', seg.sideDisabledNegative !== true, -offset);
  }

  return best;
}

function resolveViaductWallPoint(rawPoint, startPoint, options = {}) {
  const { enableNodeSnap = true, preferWallSnap = false } = options;
  const constrained = applyTrackConstraint(rawPoint, startPoint);

  if (enableNodeSnap) {
    const nearNode = findNearestViaductWallNode(constrained, startPoint ? 'light' : 'normal');
    if (nearNode && (!startPoint || distance(startPoint, nearNode) > 0.0001)) {
      return { x: nearNode.x, y: nearNode.y };
    }
  }

  if (preferWallSnap) {
    const nearWall = findNearestViaductWallProjection(constrained, { level: getActiveTrackLevel(), allowAnyLevel: false, snapRadiusPx: 7 });
    if (nearWall) {
      return { x: nearWall.x, y: nearWall.y };
    }
  }

  return constrained;
}

function collectTrackNodeCounts() {
  const counts = new Map();
  for (const seg of state.tracks) {
    const ka = trackNodeKey(seg.a, getTrackEndpointLevel(seg, 'a'));
    const kb = trackNodeKey(seg.b, getTrackEndpointLevel(seg, 'b'));
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
  return Math.round(clamp(n, -TRACK_MAX_LEVEL, TRACK_MAX_LEVEL));
}

function normalizeTrackGradient(value) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return 0;
  }
  return Math.round(clamp(n, -TRACK_MAX_LEVEL, TRACK_MAX_LEVEL));
}

function getTrackEndpointLevel(seg, endpoint) {
  const fallback = normalizeTrackLevel(seg.level);
  if (endpoint === 'a') {
    return normalizeTrackLevel(seg.levelStart ?? fallback);
  }
  return normalizeTrackLevel(seg.levelEnd ?? fallback);
}

function getTrackLevelAt(seg, t) {
  const ta = clamp(Number(t) || 0, 0, 1);
  const la = getTrackEndpointLevel(seg, 'a');
  const lb = getTrackEndpointLevel(seg, 'b');
  return la + (lb - la) * ta;
}

function getTrackElevatedTier(seg) {
  const la = getTrackEndpointLevel(seg, 'a');
  const lb = getTrackEndpointLevel(seg, 'b');
  return Math.max(0, Math.min(TRACK_MAX_LEVEL, Math.floor(Math.max(la, lb))));
}

function getTrackSideOffset(seg) {
  const tier = getTrackElevatedTier(seg);
  if (tier < 1) {
    return 0;
  }
  return TRACK_SIDE_OFFSET_DOT;
}

function getTrackAlignedLevelProfile(seg, alignedForward = true) {
  const aLv = getTrackEndpointLevel(seg, 'a');
  const bLv = getTrackEndpointLevel(seg, 'b');
  if (alignedForward) {
    return { start: aLv, end: bLv };
  }
  return { start: bLv, end: aLv };
}

function buildSideRailSuppressionMap() {
  const map = new Map();
  for (let i = 0; i < state.tracks.length; i += 1) {
    const seg = state.tracks[i];
    map.set(i, {
      skipPositiveSide: seg?.sideDisabledPositive === true,
      skipNegativeSide: seg?.sideDisabledNegative === true
    });
  }

  const overlapTol = clamp(1.1 / Math.max(0.0001, state.view.zoom), 0.08, 0.4);
  for (let i = 0; i < state.tracks.length; i += 1) {
    const segA = state.tracks[i];
    const tierA = getTrackElevatedTier(segA);
    if (tierA < 1) {
      continue;
    }

    const dxA = segA.b.x - segA.a.x;
    const dyA = segA.b.y - segA.a.y;
    const lenA = Math.hypot(dxA, dyA);
    if (lenA < 1e-6) {
      continue;
    }
    const uxA = dxA / lenA;
    const uyA = dyA / lenA;
    const nxA = -uyA;
    const nyA = uxA;
    const offA = getTrackSideOffset(segA);

    for (let j = i + 1; j < state.tracks.length; j += 1) {
      const segB = state.tracks[j];
      const tierB = getTrackElevatedTier(segB);
      if (tierB < 1) {
        continue;
      }

      const dxB = segB.b.x - segB.a.x;
      const dyB = segB.b.y - segB.a.y;
      const lenB = Math.hypot(dxB, dyB);
      if (lenB < 1e-6) {
        continue;
      }

      const cross = Math.abs(dxA * dyB - dyA * dxB) / (lenA * lenB);
      if (cross > 0.03) {
        continue;
      }

      const dot = (dxA * dxB + dyA * dyB) / (lenA * lenB);
      const profileA = getTrackAlignedLevelProfile(segA, true);
      const profileB = getTrackAlignedLevelProfile(segB, dot >= 0);
      if (Math.abs(profileA.start - profileB.start) > 0.01 || Math.abs(profileA.end - profileB.end) > 0.01) {
        continue;
      }

      const bx0 = (segB.a.x - segA.a.x) * uxA + (segB.a.y - segA.a.y) * uyA;
      const bx1 = (segB.b.x - segA.a.x) * uxA + (segB.b.y - segA.a.y) * uyA;
      const bMin = Math.min(bx0, bx1);
      const bMax = Math.max(bx0, bx1);
      const overlapStart = Math.max(0, bMin);
      const overlapEnd = Math.min(lenA, bMax);
      if (overlapEnd - overlapStart < 2) {
        continue;
      }

      const mid = (overlapStart + overlapEnd) / 2;
      const pA = { x: segA.a.x + uxA * mid, y: segA.a.y + uyA * mid };
      const prB = nearestPointOnSegment(pA, segB.a, segB.b);
      const dpx = prB.x - pA.x;
      const dpy = prB.y - pA.y;
      const signedPerp = dpx * nxA + dpy * nyA;

      const offB = getTrackSideOffset(segB);
      const expected = offA + offB;
      if (Math.abs(Math.abs(signedPerp) - expected) > overlapTol) {
        continue;
      }

      const flagsA = map.get(i);
      const flagsB = map.get(j);
      if (signedPerp >= 0) {
        flagsA.skipPositiveSide = true;
        flagsB.skipNegativeSide = true;
      } else {
        flagsA.skipNegativeSide = true;
        flagsB.skipPositiveSide = true;
      }
    }
  }

  return map;
}

function buildViaductAreaPairs() {
  const pairs = [];
  const used = new Set();
  const spanLimit = clamp(Number(state.settings.viaductSpan) || 24, 4, 80);

  for (let i = 0; i < state.viaductWalls.length; i += 1) {
    if (used.has(i)) {
      continue;
    }

    const a = state.viaductWalls[i];
    const adx = a.b.x - a.a.x;
    const ady = a.b.y - a.a.y;
    const alen = Math.hypot(adx, ady);
    if (alen < 0.8) {
      continue;
    }

    const aux = adx / alen;
    const auy = ady / alen;
    const anx = -auy;
    const any = aux;

    let best = null;
    for (let j = i + 1; j < state.viaductWalls.length; j += 1) {
      if (used.has(j)) {
        continue;
      }
      const b = state.viaductWalls[j];
      if (normalizeTrackLevel(a.level) !== normalizeTrackLevel(b.level)) {
        continue;
      }

      const bdx = b.b.x - b.a.x;
      const bdy = b.b.y - b.a.y;
      const blen = Math.hypot(bdx, bdy);
      if (blen < 0.8) {
        continue;
      }

      const cross = Math.abs(adx * bdy - ady * bdx) / (alen * blen);
      if (cross > 0.08) {
        continue;
      }

      const sa0 = 0;
      const sa1 = alen;
      const sb0 = (b.a.x - a.a.x) * aux + (b.a.y - a.a.y) * auy;
      const sb1 = (b.b.x - a.a.x) * aux + (b.b.y - a.a.y) * auy;
      const overlapStart = Math.max(sa0, Math.min(sb0, sb1));
      const overlapEnd = Math.min(sa1, Math.max(sb0, sb1));
      if (overlapEnd - overlapStart < 1.2) {
        continue;
      }

      const mid = (overlapStart + overlapEnd) / 2;
      const pa = { x: a.a.x + aux * mid, y: a.a.y + auy * mid };
      const pr = nearestPointOnSegment(pa, b.a, b.b);
      const dist = Math.hypot(pr.x - pa.x, pr.y - pa.y);
      if (dist > spanLimit) {
        continue;
      }

      if (!best || dist < best.dist) {
        best = { j, overlapStart, overlapEnd, dist, prAtoBMid: pr, aux, auy, alen };
      }
    }

    if (!best) {
      continue;
    }

    const b = state.viaductWalls[best.j];
    const sb0 = (b.a.x - a.a.x) * best.aux + (b.a.y - a.a.y) * best.auy;
    const sb1 = (b.b.x - a.a.x) * best.aux + (b.b.y - a.a.y) * best.auy;
    const denom = sb1 - sb0;
    if (Math.abs(denom) < 1e-6) {
      continue;
    }
    const u0 = (best.overlapStart - sb0) / denom;
    const u1 = (best.overlapEnd - sb0) / denom;

    const a0 = { x: a.a.x + best.aux * best.overlapStart, y: a.a.y + best.auy * best.overlapStart };
    const a1 = { x: a.a.x + best.aux * best.overlapEnd, y: a.a.y + best.auy * best.overlapEnd };
    const b0 = { x: b.a.x + (b.b.x - b.a.x) * u0, y: b.a.y + (b.b.y - b.a.y) * u0 };
    const b1 = { x: b.a.x + (b.b.x - b.a.x) * u1, y: b.a.y + (b.b.y - b.a.y) * u1 };

    pairs.push({
      i,
      j: best.j,
      level: normalizeTrackLevel(a.level),
      polygon: [a0, a1, b1, b0]
    });
    used.add(i);
    used.add(best.j);
  }

  return pairs;
}

function drawViaductAreas(forcedLevel = getActiveTrackLevel()) {
  if (state.mode !== 'viaduct-area') {
    return;
  }

  const allLevels = forcedLevel === null || forcedLevel === undefined;
  const activeLevel = allLevels ? 0 : normalizeTrackLevel(forcedLevel);
  const showAreaLevel = allLevels ? true : activeLevel > 0;
  const activeAreas = [];

  if (state.viaductAreas && state.viaductAreas.length > 0) {
    for (const area of state.viaductAreas) {
      const poly = normalizeAreaPoints(area);
      if (poly.length < 3) {
        continue;
      }
      const areaLevel = normalizeTrackLevel(area.level);
      if (!showAreaLevel || (!allLevels && areaLevel !== activeLevel)) {
        continue;
      }
      activeAreas.push(poly);
    }
  }

  if (activeAreas.length > 0) {
    if (isGpuTrackRenderingEnabled()) {
      for (const poly of activeAreas) {
        enqueueGpuPolygonFill(poly, '#eace4a', 0.34);
      }
    } else {
      ctx.fillStyle = 'rgba(234, 206, 74, 0.34)';
      ctx.beginPath();
      for (const poly of activeAreas) {
        ctx.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i += 1) {
          ctx.lineTo(poly[i].x, poly[i].y);
        }
        ctx.closePath();
      }
      ctx.fill();
    }
  }

  // Explicit viaduct areas are the source of truth. Do not infer extra fills from wall pairs.

  if (state.mode === 'viaduct-area') {
    const isErase = state.settings.viaductAreaMode === 'erase';
    const fill = isErase ? 'rgba(181, 60, 60, 0.22)' : 'rgba(55, 122, 184, 0.2)';
    const stroke = isErase ? 'rgba(176, 38, 38, 0.9)' : 'rgba(19, 102, 172, 0.92)';
    ctx.lineWidth = clamp(1.1 / Math.max(0.0001, state.view.zoom), 0.08, 0.26);
    ctx.setLineDash([0.5, 0.35]);

    if (state.settings.viaductAreaShape === 'rect' && state.draftingViaductAreaStart && state.draftingViaductAreaCurrent) {
      const a = state.draftingViaductAreaStart;
      const b = state.draftingViaductAreaCurrent;
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = stroke;
      ctx.strokeRect(x, y, w, h);
    }

    if (state.settings.viaductAreaShape === 'poly' && state.draftingViaductAreaPoints.length > 0) {
      const points = [...state.draftingViaductAreaPoints];
      if (state.draftingViaductAreaCurrent) {
        points.push(state.draftingViaductAreaCurrent);
      }
      if (points.length >= 2) {
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        if (points.length >= 3) {
          ctx.closePath();
          ctx.fill();
        }
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);

    if (state.mousePreview) {
      drawCursorMarker(state.mousePreview, {
        hasStart: Boolean(state.draftingViaductAreaStart) || state.draftingViaductAreaPoints.length > 0,
        strokeIdle: isErase ? 'rgba(170, 58, 58, 0.95)' : 'rgba(24, 112, 175, 0.95)',
        strokeActive: isErase ? 'rgba(188, 72, 72, 0.96)' : 'rgba(36, 133, 199, 0.96)',
        fillIdle: isErase ? 'rgba(216, 124, 124, 0.9)' : 'rgba(76, 155, 212, 0.9)',
        fillActive: isErase ? 'rgba(230, 142, 142, 0.92)' : 'rgba(94, 174, 230, 0.92)',
        baseRadius: 0.64,
        activeRadius: 0.58,
        innerIdle: 0.2,
        innerActive: 0.17,
        lineScale: 1.5,
        lineMin: 0.14,
        lineMax: 0.46
      });
    }
  }
}

function normalizeAreaPoints(area) {
  if (area && Array.isArray(area.points) && area.points.length >= 3) {
    const normalized = [];
    for (const p of area.points) {
      if (Array.isArray(p) && p.length >= 2) {
        const x = Number(p[0]);
        const y = Number(p[1]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          normalized.push({ x, y });
        }
        continue;
      }
      const x = Number(p?.x);
      const y = Number(p?.y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        normalized.push({ x, y });
      }
    }
    if (normalized.length >= 3) {
      return normalized;
    }
  }
  if (area && Array.isArray(area.polygon) && area.polygon.length >= 3) {
    const normalized = [];
    for (const p of area.polygon) {
      if (Array.isArray(p) && p.length >= 2) {
        const x = Number(p[0]);
        const y = Number(p[1]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          normalized.push({ x, y });
        }
        continue;
      }
      const x = Number(p?.x);
      const y = Number(p?.y);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        normalized.push({ x, y });
      }
    }
    if (normalized.length >= 3) {
      return normalized;
    }
  }
  if (area && area.a && area.b) {
    const rect = buildNormalizedRect(area.a, area.b);
    return [
      { x: rect.x1, y: rect.y1 },
      { x: rect.x2, y: rect.y1 },
      { x: rect.x2, y: rect.y2 },
      { x: rect.x1, y: rect.y2 }
    ];
  }
  return [];
}

function polygonBounds(points) {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const p of points) {
    x1 = Math.min(x1, p.x);
    y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x);
    y2 = Math.max(y2, p.y);
  }
  return { x1, y1, x2, y2 };
}

function polygonCentroid(points) {
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = ((yi > point.y) !== (yj > point.y))
      && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function segmentsIntersect(a1, a2, b1, b2) {
  const ccw = (p1, p2, p3) => (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  return ccw(a1, b1, b2) !== ccw(a2, b1, b2) && ccw(a1, a2, b1) !== ccw(a1, a2, b2);
}

function polygonsOverlap(polyA, polyB) {
  const ba = polygonBounds(polyA);
  const bb = polygonBounds(polyB);
  if (ba.x2 < bb.x1 || bb.x2 < ba.x1 || ba.y2 < bb.y1 || bb.y2 < ba.y1) {
    return false;
  }

  for (const p of polyA) {
    if (pointInPolygon(p, polyB)) {
      return true;
    }
  }
  for (const p of polyB) {
    if (pointInPolygon(p, polyA)) {
      return true;
    }
  }

  for (let i = 0; i < polyA.length; i += 1) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j += 1) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

function getRectFromAxisAlignedPolygon(points) {
  if (!Array.isArray(points) || points.length !== 4) {
    return null;
  }
  const b = polygonBounds(points);
  const tol = 1e-5;
  for (const p of points) {
    const onX = Math.abs(p.x - b.x1) < tol || Math.abs(p.x - b.x2) < tol;
    const onY = Math.abs(p.y - b.y1) < tol || Math.abs(p.y - b.y2) < tol;
    if (!onX || !onY) {
      return null;
    }
  }
  if (rectArea(b) < 0.02) {
    return null;
  }
  return b;
}

function rectToPolygon(rect) {
  return [
    { x: rect.x1, y: rect.y1 },
    { x: rect.x2, y: rect.y1 },
    { x: rect.x2, y: rect.y2 },
    { x: rect.x1, y: rect.y2 }
  ];
}

function tryMergeRects(a, b) {
  const tol = 1e-6;
  const sameY = Math.abs(a.y1 - b.y1) < tol && Math.abs(a.y2 - b.y2) < tol;
  const sameX = Math.abs(a.x1 - b.x1) < tol && Math.abs(a.x2 - b.x2) < tol;
  if (sameY) {
    const overlap = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
    if (overlap >= -tol) {
      return { x1: Math.min(a.x1, b.x1), y1: a.y1, x2: Math.max(a.x2, b.x2), y2: a.y2 };
    }
  }
  if (sameX) {
    const overlap = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
    if (overlap >= -tol) {
      return { x1: a.x1, y1: Math.min(a.y1, b.y1), x2: a.x2, y2: Math.max(a.y2, b.y2) };
    }
  }
  return null;
}

function mergeViaductAreaRectangles() {
  const grouped = new Map();
  const others = [];
  for (const area of state.viaductAreas) {
    const lv = normalizeTrackLevel(area.level);
    const rect = getRectFromAxisAlignedPolygon(normalizeAreaPoints(area));
    if (!rect) {
      others.push({ level: lv, points: normalizeAreaPoints(area) });
      continue;
    }
    if (!grouped.has(lv)) {
      grouped.set(lv, []);
    }
    grouped.get(lv).push(rect);
  }

  const mergedAreas = [...others];
  for (const [level, rects] of grouped.entries()) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < rects.length && !changed; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          const merged = tryMergeRects(rects[i], rects[j]);
          if (merged) {
            rects.splice(j, 1);
            rects[i] = merged;
            changed = true;
            break;
          }
        }
      }
    }
    for (const rect of rects) {
      mergedAreas.push({ level, points: rectToPolygon(rect) });
    }
  }

  state.viaductAreas = cleanupViaductAreas(mergedAreas);
}

function pointInPolygonOrEdge(point, polygon) {
  const tol = 1e-6;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = point.x - a.x;
    const apy = point.y - a.y;
    const cross = Math.abs(abx * apy - aby * apx);
    const dot = apx * abx + apy * aby;
    const len2 = abx * abx + aby * aby;
    if (cross <= tol && dot >= -tol && dot <= len2 + tol) {
      return true;
    }
  }
  return pointInPolygon(point, polygon);
}

function polygonSignature(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return '';
  }
  const encoded = points.map((p) => `${Number(p.x).toFixed(4)},${Number(p.y).toFixed(4)}`);
  const n = encoded.length;
  let best = null;

  for (let start = 0; start < n; start += 1) {
    const seq = [];
    for (let k = 0; k < n; k += 1) {
      seq.push(encoded[(start + k) % n]);
    }
    const key = seq.join('|');
    if (!best || key < best) {
      best = key;
    }
  }

  for (let start = 0; start < n; start += 1) {
    const seq = [];
    for (let k = 0; k < n; k += 1) {
      seq.push(encoded[(start - k + n * 10) % n]);
    }
    const key = seq.join('|');
    if (!best || key < best) {
      best = key;
    }
  }

  return best;
}

function isPolygonContained(inner, outer) {
  if (!inner || !outer || inner.length < 3 || outer.length < 3) {
    return false;
  }
  for (const p of inner) {
    if (!pointInPolygonOrEdge(p, outer)) {
      return false;
    }
  }
  return true;
}

function cleanupViaductAreas(areas) {
  const normalized = (areas || [])
    .map((area) => ({
      level: normalizeTrackLevel(area.level),
      points: normalizeAreaPoints(area)
    }))
    .filter((area) => area.points.length >= 3);

  const deduped = [];
  const seen = new Set();
  for (const area of normalized) {
    const key = `${area.level}|${polygonSignature(area.points)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(area);
  }

  return deduped;
}

function buildNormalizedRect(a, b) {
  return {
    x1: Math.min(a.x, b.x),
    y1: Math.min(a.y, b.y),
    x2: Math.max(a.x, b.x),
    y2: Math.max(a.y, b.y)
  };
}

function rectArea(rect) {
  return Math.max(0, rect.x2 - rect.x1) * Math.max(0, rect.y2 - rect.y1);
}

function subtractRectFromRect(src, cut) {
  const ix1 = Math.max(src.x1, cut.x1);
  const iy1 = Math.max(src.y1, cut.y1);
  const ix2 = Math.min(src.x2, cut.x2);
  const iy2 = Math.min(src.y2, cut.y2);
  if (ix1 >= ix2 || iy1 >= iy2) {
    return [src];
  }

  const parts = [];
  if (src.y1 < iy1) {
    parts.push({ x1: src.x1, y1: src.y1, x2: src.x2, y2: iy1 });
  }
  if (iy2 < src.y2) {
    parts.push({ x1: src.x1, y1: iy2, x2: src.x2, y2: src.y2 });
  }
  if (src.x1 < ix1) {
    parts.push({ x1: src.x1, y1: iy1, x2: ix1, y2: iy2 });
  }
  if (ix2 < src.x2) {
    parts.push({ x1: ix2, y1: iy1, x2: src.x2, y2: iy2 });
  }

  return parts.filter((r) => rectArea(r) > 0.02);
}

function applyViaductAreaRect(start, end) {
  const rect = buildNormalizedRect(start, end);
  if (rectArea(rect) < 0.6) {
    return false;
  }

  const level = getActiveTrackLevel();
  const eraserPoly = rectToPolygon(rect);
  if (state.settings.viaductAreaMode === 'paint') {
    state.viaductAreas.push({
      level,
      points: rectToPolygon(rect)
    });
    mergeViaductAreaRectangles();
    return true;
  }

  let changed = false;
  const nextAreas = [];
  for (const area of state.viaductAreas) {
    const areaLevel = normalizeTrackLevel(area.level);
    const poly = normalizeAreaPoints(area);
    if (areaLevel !== level) {
      nextAreas.push(area);
      continue;
    }

    const srcRect = getRectFromAxisAlignedPolygon(poly);
    if (srcRect) {
      const pieces = subtractRectFromRect(srcRect, rect);
      if (pieces.length !== 1 || pieces[0].x1 !== srcRect.x1 || pieces[0].y1 !== srcRect.y1 || pieces[0].x2 !== srcRect.x2 || pieces[0].y2 !== srcRect.y2) {
        changed = true;
      }
      for (const p of pieces) {
        nextAreas.push({ level, points: rectToPolygon(p) });
      }
      continue;
    }

    // Legacy/imported non-rect areas should also be erasable by overlap.
    if (polygonsOverlap(poly, eraserPoly) || isPolygonContained(poly, eraserPoly)) {
      changed = true;
      continue;
    }
    nextAreas.push({ level: areaLevel, points: poly });
  }
  state.viaductAreas = nextAreas;
  mergeViaductAreaRectangles();
  return changed;
}

function applyViaductAreaPolygon(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return false;
  }
  const level = getActiveTrackLevel();
  const poly = points.map((p) => ({ x: p.x, y: p.y }));

  if (state.settings.viaductAreaMode === 'paint') {
    state.viaductAreas.push({ level, points: poly });
    mergeViaductAreaRectangles();
    return true;
  }

  const next = [];
  let changed = false;
  for (const area of state.viaductAreas) {
    const areaPoly = normalizeAreaPoints(area);
    const areaLevel = normalizeTrackLevel(area.level);
    if (areaLevel !== level) {
      next.push({ level: areaLevel, points: areaPoly });
      continue;
    }

    // Polygon erase should remove touched areas for compatibility with older area shapes.
    if (polygonsOverlap(areaPoly, poly) || isPolygonContained(areaPoly, poly)) {
      changed = true;
      continue;
    }
    next.push({ level: areaLevel, points: areaPoly });
  }
  state.viaductAreas = next;
  mergeViaductAreaRectangles();
  return changed;
}

function drawViaductWalls(forcedLevel = getActiveTrackLevel()) {
  if (!state.viaductWalls) {
    return;
  }
  const allLevels = forcedLevel === null || forcedLevel === undefined;
  const activeLevel = allLevels ? 0 : normalizeTrackLevel(forcedLevel);
  const wallWidth = clamp(1.1 / Math.max(0.0001, state.view.zoom), 0.09, 0.28);
  const useGpuTrackRendering = isGpuTrackRenderingEnabled();
  const wallWidthPx = wallWidth * state.view.zoom;

  if (!useGpuTrackRendering) {
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.95)';
    ctx.lineWidth = wallWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
  }

  for (const wall of state.viaductWalls) {
    const wallLevel = normalizeTrackLevel(wall.level);
    if (!allLevels && wallLevel !== activeLevel) {
      continue;
    }

    if (useGpuTrackRendering) {
      enqueueGpuTrackSegment(wall.a, wall.b, '#141414', 0.95, wallWidthPx);
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(wall.a.x, wall.a.y);
    ctx.lineTo(wall.b.x, wall.b.y);
    ctx.stroke();
  }
  if (!useGpuTrackRendering) {
    ctx.globalAlpha = 1;
  }

  if (state.mode === 'viaduct' && state.draftingViaductStart && state.draftingViaductCurrent) {
    ctx.strokeStyle = 'rgba(16, 16, 16, 0.8)';
    ctx.lineWidth = wallWidth;
    ctx.setLineDash([0.3, 0.25]);
    ctx.beginPath();
    ctx.moveTo(state.draftingViaductStart.x, state.draftingViaductStart.y);
    ctx.lineTo(state.draftingViaductCurrent.x, state.draftingViaductCurrent.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (state.selection && state.selection.type === 'viaduct') {
    const wall = state.viaductWalls[state.selection.index];
    if (wall) {
      const selectLineWidth = Math.max(wallWidth + 0.14, 0.2);
      const haloWidth = selectLineWidth + clamp(1.6 / Math.max(0.0001, state.view.zoom), 0.14, 0.52);

      // Strong underlay so selected wall is obvious in erase mode.
      ctx.strokeStyle = 'rgba(61, 173, 255, 0.34)';
      ctx.lineWidth = haloWidth;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(wall.a.x, wall.a.y);
      ctx.lineTo(wall.b.x, wall.b.y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(10, 130, 220, 0.95)';
      ctx.lineWidth = selectLineWidth;
      ctx.setLineDash([0.5, 0.35]);
      ctx.beginPath();
      ctx.moveTo(wall.a.x, wall.a.y);
      ctx.lineTo(wall.b.x, wall.b.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const nodeRadius = clamp(2.8 / Math.max(0.0001, state.view.zoom), 0.18, 0.46);
      ctx.fillStyle = 'rgba(20, 153, 245, 0.98)';
      ctx.beginPath();
      ctx.arc(wall.a.x, wall.a.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(wall.b.x, wall.b.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function getRequiredTrackLength(startLevel, endLevel) {
  const baseMin = Math.max(1, Number(state.settings.minTrackLength) || 1);
  if (normalizeTrackLevel(startLevel) !== normalizeTrackLevel(endLevel)) {
    return Math.max(10, baseMin);
  }
  return baseMin;
}

function getActiveTrackLevel() {
  return normalizeTrackLevel(state.settings.trackLevel);
}

function isAvailableMode() {
  return state.mode === 'available';
}

function trackTouchesLevel(seg, level) {
  const lv = normalizeTrackLevel(level);
  const la = getTrackEndpointLevel(seg, 'a');
  const lb = getTrackEndpointLevel(seg, 'b');
  const minLv = Math.min(la, lb);
  const maxLv = Math.max(la, lb);
  return lv >= minLv && lv <= maxLv;
}

function getTrackLevelVisualAlpha(seg, level = getActiveTrackLevel()) {
  return trackTouchesLevel(seg, level) ? 1 : 0.2;
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

function segmentIntersectionPoint(a1, a2, b1, b2, options = {}) {
  const { allowEndpointTouch = false, endpointTolerance = 0.001 } = options;
  const r = { x: a2.x - a1.x, y: a2.y - a1.y };
  const s = { x: b2.x - b1.x, y: b2.y - b1.y };
  const denom = r.x * s.y - r.y * s.x;
  if (Math.abs(denom) < 1e-8) {
    return null;
  }

  const qmp = { x: b1.x - a1.x, y: b1.y - a1.y };
  const t = (qmp.x * s.y - qmp.y * s.x) / denom;
  const u = (qmp.x * r.y - qmp.y * r.x) / denom;

  if (!allowEndpointTouch) {
    if (t <= endpointTolerance || t >= (1 - endpointTolerance)
      || u <= endpointTolerance || u >= (1 - endpointTolerance)) {
      return null;
    }
  } else {
    const onA = t >= -endpointTolerance && t <= 1 + endpointTolerance;
    const onB = u >= -endpointTolerance && u <= 1 + endpointTolerance;
    if (!onA || !onB) {
      return null;
    }
  }

  const tc = clamp(t, 0, 1);
  const uc = clamp(u, 0, 1);
  return { x: a1.x + tc * r.x, y: a1.y + tc * r.y, t: tc, u: uc };
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

function drawTrackSideLines(seg, halfLength = null, center = null, alphaMul = 1, options = {}) {
  const { skipPositiveSide = false, skipNegativeSide = false, visibleRanges = null } = options;
  const tier = getTrackElevatedTier(seg);
  if (tier < 1) {
    return;
  }

  const dx = seg.b.x - seg.a.x;
  const dy = seg.b.y - seg.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return;
  }

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const offset = getTrackSideOffset(seg);
  const sideLineWidth = clamp(1.15 / Math.max(0.0001, state.view.zoom), 0.09, 0.28);
  const useGpuTrackRendering = isGpuTrackRenderingEnabled();
  const sideLineWidthPx = sideLineWidth * state.view.zoom;
  const sideAlpha = 0.88 * alphaMul;

  const isInlineSegment = !center || !Number.isFinite(halfLength);
  let segStartDist = 0;
  let segEndDist = len;
  if (!isInlineSegment) {
    const sx = center.x - ux * halfLength;
    const sy = center.y - uy * halfLength;
    const ex = center.x + ux * halfLength;
    const ey = center.y + uy * halfLength;
    segStartDist = clamp((sx - seg.a.x) * ux + (sy - seg.a.y) * uy, 0, len);
    segEndDist = clamp((ex - seg.a.x) * ux + (ey - seg.a.y) * uy, 0, len);
    if (segEndDist < segStartDist) {
      const tmp = segStartDist;
      segStartDist = segEndDist;
      segEndDist = tmp;
    }
  }

  const drawOffsetRange = (startDist, endDist) => {
    if (endDist - startDist <= 1e-6) {
      return;
    }
    const sx = seg.a.x + ux * startDist;
    const sy = seg.a.y + uy * startDist;
    const ex = seg.a.x + ux * endDist;
    const ey = seg.a.y + uy * endDist;

    if (!skipPositiveSide) {
      const a = { x: sx + nx * offset, y: sy + ny * offset };
      const b = { x: ex + nx * offset, y: ey + ny * offset };
      if (useGpuTrackRendering) {
        enqueueGpuTrackSegment(a, b, TRACK_ELEVATED_SIDE_COLOR, sideAlpha, sideLineWidthPx);
      } else {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    if (!skipNegativeSide) {
      const a = { x: sx - nx * offset, y: sy - ny * offset };
      const b = { x: ex - nx * offset, y: ey - ny * offset };
      if (useGpuTrackRendering) {
        enqueueGpuTrackSegment(a, b, TRACK_ELEVATED_SIDE_COLOR, sideAlpha, sideLineWidthPx);
      } else {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  };

  const drawVisibleOffsetRanges = (startDist, endDist) => {
    if (!Array.isArray(visibleRanges)) {
      drawOffsetRange(startDist, endDist);
      return;
    }
    if (visibleRanges.length === 0) {
      return;
    }

    for (const range of visibleRanges) {
      const s = Math.max(startDist, Number(range.start));
      const e = Math.min(endDist, Number(range.end));
      if (e - s <= 1e-6) {
        continue;
      }
      drawOffsetRange(s, e);
    }
  };

  if (!useGpuTrackRendering) {
    ctx.strokeStyle = TRACK_ELEVATED_SIDE_COLOR;
    ctx.lineWidth = sideLineWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    ctx.globalAlpha = sideAlpha;
  }

  const la = getTrackEndpointLevel(seg, 'a');
  const lb = getTrackEndpointLevel(seg, 'b');
  const isGradient = la !== lb;
  if (!isInlineSegment) {
    drawVisibleOffsetRanges(segStartDist, segEndDist);
    if (!useGpuTrackRendering) {
      ctx.globalAlpha = 1;
    }
    return;
  }

  if (isInlineSegment && isGradient && len >= 1.05) {
    const lowerIsStart = la < lb;
    const lowerLevel = lowerIsStart ? la : lb;
    if (lowerLevel === 0) {
      const noSideLen = Math.min(1, len);
      if (lowerIsStart) {
        drawVisibleOffsetRanges(noSideLen, len);
      } else {
        drawVisibleOffsetRanges(0, Math.max(0, len - noSideLen));
      }

      if (!useGpuTrackRendering) {
        ctx.globalAlpha = 1;
      }
      return;
    }
  }

  drawVisibleOffsetRanges(segStartDist, segEndDist);

  if (!useGpuTrackRendering) {
    ctx.globalAlpha = 1;
  }
}

function isDistanceInVisibleRanges(distanceOnSegment, ranges, tolerance = 1e-4) {
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return false;
  }
  for (const range of ranges) {
    const s = Number(range.start);
    const e = Number(range.end);
    if (!Number.isFinite(s) || !Number.isFinite(e)) {
      continue;
    }
    if (distanceOnSegment >= s - tolerance && distanceOnSegment <= e + tolerance) {
      return true;
    }
  }
  return false;
}

function isPointInsideHigherViaductAreaOrEdge(point, trackLevel) {
  const baseLevel = normalizeTrackLevel(trackLevel);
  if (!state.viaductAreas || state.viaductAreas.length === 0) {
    return false;
  }

  for (const area of state.viaductAreas) {
    const areaLevel = normalizeTrackLevel(area.level);
    if (areaLevel <= 0 || areaLevel <= baseLevel) {
      continue;
    }
    const poly = normalizeAreaPoints(area);
    if (poly.length < 3) {
      continue;
    }
    if (pointInPolygonOrEdge(point, poly)) {
      return true;
    }
  }

  return false;
}

function estimateCircleHigherAreaCoverage(center, radius, baseLevel) {
  if (radius <= 1e-6) {
    return 0;
  }

  const radialScales = [0.3, 0.55, 0.8, 1.0];
  const angleSteps = 36;
  let total = 0;
  let covered = 0;

  for (const s of radialScales) {
    const rr = radius * s;
    for (let i = 0; i < angleSteps; i += 1) {
      const a = (Math.PI * 2 * i) / angleSteps;
      const probe = { x: center.x + Math.cos(a) * rr, y: center.y + Math.sin(a) * rr };
      total += 1;
      if (isPointInsideHigherViaductAreaOrEdge(probe, baseLevel)) {
        covered += 1;
      }
    }
  }

  return total > 0 ? covered / total : 0;
}

function drawLevelAwareIntersectionCircle(center, radius, baseLevel, color, alpha = TRACK_BODY_ALPHA) {
  const baseLv = normalizeTrackLevel(baseLevel);
  if (radius <= 1e-6) {
    return;
  }

  const coveredRatio = estimateCircleHigherAreaCoverage(center, radius, baseLv);
  if (coveredRatio >= 0.6) {
    return;
  }

  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Overwrite by the real higher-area polygons, clipped to the circle.
  if (state.viaductAreas && state.viaductAreas.length > 0) {
    const minX = center.x - radius;
    const maxX = center.x + radius;
    const minY = center.y - radius;
    const maxY = center.y + radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius + 0.01, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = PAPER_COLOR;
    ctx.globalAlpha = 1;

    for (const area of state.viaductAreas) {
      const areaLevel = normalizeTrackLevel(area.level);
      if (areaLevel <= 0 || areaLevel <= baseLv) {
        continue;
      }

      const poly = normalizeAreaPoints(area);
      if (poly.length < 3) {
        continue;
      }

      let polyMinX = Infinity;
      let polyMaxX = -Infinity;
      let polyMinY = Infinity;
      let polyMaxY = -Infinity;
      for (const p of poly) {
        if (p.x < polyMinX) {
          polyMinX = p.x;
        }
        if (p.x > polyMaxX) {
          polyMaxX = p.x;
        }
        if (p.y < polyMinY) {
          polyMinY = p.y;
        }
        if (p.y > polyMaxY) {
          polyMaxY = p.y;
        }
      }

      if (polyMaxX < minX || polyMinX > maxX || polyMaxY < minY || polyMinY > maxY) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i += 1) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

function drawLevelCrossingHints(forcedLevel = getActiveTrackLevel(), visibleRangesPerTrack = null) {
  if (state.tracks.length < 2) {
    return;
  }

  const allLevels = forcedLevel === null || forcedLevel === undefined;
  const activeLevel = allLevels ? 0 : normalizeTrackLevel(forcedLevel);
  const rangesByTrack = Array.isArray(visibleRangesPerTrack)
    ? visibleRangesPerTrack
    : state.tracks.map((seg) => getTrackVisibleDistanceRanges(seg));

  for (let i = 0; i < state.tracks.length; i += 1) {
    for (let j = i + 1; j < state.tracks.length; j += 1) {
      const segA = state.tracks[i];
      const segB = state.tracks[j];
      const p = segmentIntersectionPoint(segA.a, segA.b, segB.a, segB.b, {
        allowEndpointTouch: true
      });
      if (!p) {
        continue;
      }

      const lvA = getTrackLevelAt(segA, p.t);
      const lvB = getTrackLevelAt(segB, p.u);
      if (Math.abs(lvA - lvB) > 0.01) {
        continue;
      }

      const intersectionLevel = normalizeTrackLevel(lvA);
      if (!allLevels && intersectionLevel !== activeLevel) {
        continue;
      }

      const lenA = Math.hypot(segA.b.x - segA.a.x, segA.b.y - segA.a.y);
      const lenB = Math.hypot(segB.b.x - segB.a.x, segB.b.y - segB.a.y);
      if (lenA < 1e-6 || lenB < 1e-6) {
        continue;
      }
      const distA = p.t * lenA;
      const distB = p.u * lenB;
      const aVisible = isDistanceInVisibleRanges(distA, rangesByTrack[i]);
      const bVisible = isDistanceInVisibleRanges(distB, rangesByTrack[j]);
      if (!aVisible || !bVisible) {
        continue;
      }

      drawTrackJoinCircle(p, 1.0, intersectionLevel, normalizeTrackColor(segA.color), TRACK_BODY_ALPHA);
    }
  }

  ctx.setLineDash([]);
}

function isPointInsideViaductArea(point, level) {
  const lv = normalizeTrackLevel(level);
  if (lv <= 0 || !state.viaductAreas || state.viaductAreas.length === 0) {
    return false;
  }

  for (const area of state.viaductAreas) {
    if (normalizeTrackLevel(area.level) !== lv) {
      continue;
    }
    const poly = normalizeAreaPoints(area);
    if (poly.length < 3) {
      continue;
    }
    if (pointInPolygon(point, poly)) {
      return true;
    }
  }

  return false;
}

function isPointInsideHigherViaductArea(point, trackLevel) {
  const baseLevel = normalizeTrackLevel(trackLevel);
  if (!state.viaductAreas || state.viaductAreas.length === 0) {
    return false;
  }

  for (const area of state.viaductAreas) {
    const areaLevel = normalizeTrackLevel(area.level);
    if (areaLevel <= 0 || areaLevel <= baseLevel) {
      continue;
    }
    const poly = normalizeAreaPoints(area);
    if (poly.length < 3) {
      continue;
    }
    if (pointInPolygon(point, poly)) {
      return true;
    }
  }

  return false;
}

function getTrackVisibleDistanceRanges(seg) {
  const dx = seg.b.x - seg.a.x;
  const dy = seg.b.y - seg.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return [];
  }
  // Keep gradient segments continuous; clipping them causes visual breaks at ramps.
  if (getTrackEndpointLevel(seg, 'a') !== getTrackEndpointLevel(seg, 'b')) {
    return [{ start: 0, end: len }];
  }
  if (!state.viaductAreas || state.viaductAreas.length === 0) {
    return [{ start: 0, end: len }];
  }

  const sampleCount = Math.max(12, Math.min(220, Math.ceil(len * 6)));
  const pointAt = (t) => ({ x: seg.a.x + dx * t, y: seg.a.y + dy * t });
  const hiddenAt = (t) => isPointInsideHigherViaductArea(pointAt(t), getTrackLevelAt(seg, t));
  const refineBoundary = (t0, t1, hiddenOnLeft) => {
    let lo = t0;
    let hi = t1;
    for (let i = 0; i < 8; i += 1) {
      const mid = (lo + hi) * 0.5;
      if (hiddenAt(mid) === hiddenOnLeft) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) * 0.5;
  };

  const hiddenRanges = [];
  let runStart = 0;
  let runHidden = hiddenAt(0);
  for (let i = 1; i <= sampleCount; i += 1) {
    const t = i / sampleCount;
    const currentHidden = hiddenAt(t);
    if (currentHidden !== runHidden) {
      const edge = refineBoundary((i - 1) / sampleCount, t, runHidden);
      if (runHidden) {
        hiddenRanges.push({ start: runStart, end: edge });
      }
      runStart = edge;
      runHidden = currentHidden;
    }
  }
  if (runHidden) {
    hiddenRanges.push({ start: runStart, end: 1 });
  }

  if (hiddenRanges.length === 0) {
    return [{ start: 0, end: len }];
  }

  const visibleRanges = [];
  let cursor = 0;
  for (const hidden of hiddenRanges) {
    const hs = clamp(hidden.start, 0, 1);
    const he = clamp(hidden.end, 0, 1);
    if (hs - cursor > 1e-5) {
      visibleRanges.push({ start: cursor * len, end: hs * len });
    }
    cursor = Math.max(cursor, he);
  }
  if (1 - cursor > 1e-5) {
    visibleRanges.push({ start: cursor * len, end: len });
  }

  return visibleRanges;
}

function drawDeadEndMarkers(nodeCounts, forcedLevel = getActiveTrackLevel()) {
  if (state.tracks.length === 0) {
    return;
  }

  const allLevels = forcedLevel === null || forcedLevel === undefined;
  const markerHalfLength = 1.5; // +/-1.5u from endpoint
  const activeLevel = allLevels ? 0 : normalizeTrackLevel(forcedLevel);
  const markerWidthWorld = getPlatformWorldWidth();
  const useGpuTrackRendering = isGpuTrackRenderingEnabled();
  const markerWidthPx = markerWidthWorld * state.view.zoom;
  if (!useGpuTrackRendering) {
    ctx.lineWidth = markerWidthWorld;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  const drawAtEndpoint = (end, other, segColor) => {
    const dx = other.x - end.x;
    const dy = other.y - end.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      return;
    }

    const nx = -dy / len;
    const ny = dx / len;
    const a = { x: end.x - nx * markerHalfLength, y: end.y - ny * markerHalfLength };
    const b = { x: end.x + nx * markerHalfLength, y: end.y + ny * markerHalfLength };
    if (useGpuTrackRendering) {
      enqueueGpuTrackSegment(a, b, segColor, 1, markerWidthPx);
      return;
    }

    ctx.strokeStyle = normalizeTrackColor(segColor);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  const isEndpointConnected = (segIndex, endpointName) => {
    const seg = state.tracks[segIndex];
    const endpoint = endpointName === 'a' ? seg.a : seg.b;
    const endpointLv = getTrackEndpointLevel(seg, endpointName);

    if ((nodeCounts.get(trackNodeKey(endpoint, endpointLv)) || 0) >= 2) {
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
      const otherLv = getTrackLevelAt(other, pr.t);
      if (pr.t > 0.02 && pr.t < 0.98 && pr.dist <= interiorSnapTol && Math.abs(otherLv - endpointLv) <= 0.35) {
        return true;
      }
    }

    return false;
  };

  for (let i = 0; i < state.tracks.length; i += 1) {
    const seg = state.tracks[i];
    if (!allLevels && !trackTouchesLevel(seg, activeLevel)) {
      continue;
    }
    ctx.globalAlpha = 1;
    const aBaseLevel = allLevels ? getTrackEndpointLevel(seg, 'a') : activeLevel;
    const bBaseLevel = allLevels ? getTrackEndpointLevel(seg, 'b') : activeLevel;
    const aHidden = isPointInsideHigherViaductArea(seg.a, aBaseLevel);
    const bHidden = isPointInsideHigherViaductArea(seg.b, bBaseLevel);
    if (!aHidden && !isEndpointConnected(i, 'a')) {
      drawAtEndpoint(seg.a, seg.b, seg.color);
    }
    if (!bHidden && !isEndpointConnected(i, 'b')) {
      drawAtEndpoint(seg.b, seg.a, seg.color);
    }
  }
  ctx.globalAlpha = 1;
}

function buildTrackSegment(start, end, options = {}) {
  const defaultStart = normalizeTrackLevel(state.settings.trackLevel);
  const gradient = normalizeTrackGradient(state.settings.trackGradient);
  const defaultEnd = normalizeTrackLevel(defaultStart + gradient);
  const levelStart = normalizeTrackLevel(options.levelStart ?? defaultStart);
  const levelEnd = normalizeTrackLevel(options.levelEnd ?? defaultEnd);
  return {
    a: { x: start.x, y: start.y },
    b: { x: end.x, y: end.y },
    level: levelStart,
    levelStart,
    levelEnd,
    lineType: normalizeTrackLineType(state.settings.trackLineType),
    color: normalizeTrackColor(state.settings.trackColor),
    sideDisabledPositive: false,
    sideDisabledNegative: false
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
  const level = selectedTrack ? getTrackEndpointLevel(selectedTrack, 'a') : normalizeTrackLevel(state.settings.trackLevel);
  const gradient = selectedTrack
    ? normalizeTrackGradient(getTrackEndpointLevel(selectedTrack, 'b') - getTrackEndpointLevel(selectedTrack, 'a'))
    : normalizeTrackGradient(state.settings.trackGradient);
  const lineType = selectedTrack ? normalizeTrackLineType(selectedTrack.lineType) : normalizeTrackLineType(state.settings.trackLineType);
  const color = selectedTrack ? normalizeTrackColor(selectedTrack.color) : normalizeTrackColor(state.settings.trackColor);

  if (trackLevelInput) {
    trackLevelInput.value = String(level);
  }
  updateLevelIndicator(level);
  if (trackLineTypeSelect) {
    trackLineTypeSelect.value = lineType;
  }
  if (trackGradientSelect) {
    trackGradientSelect.value = String(gradient);
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
  const levelStart = normalizeTrackLevel(state.settings.trackLevel);
  const gradient = normalizeTrackGradient(state.settings.trackGradient);
  const levelEnd = normalizeTrackLevel(levelStart + gradient);
  seg.level = levelStart;
  seg.levelStart = levelStart;
  seg.levelEnd = levelEnd;
  seg.lineType = normalizeTrackLineType(state.settings.trackLineType);
  seg.color = normalizeTrackColor(state.settings.trackColor);
  return true;
}

function updateLevelIndicator(levelValue) {
  if (!levelIndicator) {
    return;
  }
  const lv = normalizeTrackLevel(levelValue);
  const sign = lv > 0 ? '+' : '';
  levelIndicator.textContent = `Lv ${sign}${lv} (0基準)`;
}

function setTrackLevelValue(nextLevel, options = {}) {
  const { commit = false } = options;
  const normalized = normalizeTrackLevel(nextLevel);
  state.settings.trackLevel = normalized;
  if (trackLevelInput) {
    trackLevelInput.value = String(normalized);
  }
  updateLevelIndicator(normalized);

  if (state.selection && state.selection.type === 'track') {
    const seg = state.tracks[state.selection.index];
    if (!seg || !trackTouchesLevel(seg, normalized)) {
      state.selection = null;
    }
  }

  if (applyTrackSettingsToSelection()) {
    if (commit) {
      commitHistory();
    }
  }

  render();
}

function getPlatformSegments() {
  return state.platforms.filter((p) => p && p.a && p.b);
}

function getPlatformLevel(platform) {
  return normalizeTrackLevel(platform?.level);
}

function getPlatformVisibleDistanceRanges(platform) {
  if (!platform || !platform.a || !platform.b) {
    return [];
  }

  const dx = platform.b.x - platform.a.x;
  const dy = platform.b.y - platform.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return [];
  }

  const platformLevel = getPlatformLevel(platform);
  const sampleCount = Math.max(12, Math.min(220, Math.ceil(len * 6)));
  const pointAt = (t) => ({ x: platform.a.x + dx * t, y: platform.a.y + dy * t });
  const hiddenAt = (t) => isPointInsideHigherViaductArea(pointAt(t), platformLevel);
  const refineBoundary = (t0, t1, hiddenOnLeft) => {
    let lo = t0;
    let hi = t1;
    for (let i = 0; i < 8; i += 1) {
      const mid = (lo + hi) * 0.5;
      if (hiddenAt(mid) === hiddenOnLeft) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) * 0.5;
  };

  const hiddenRanges = [];
  let runStart = 0;
  let runHidden = hiddenAt(0);
  for (let i = 1; i <= sampleCount; i += 1) {
    const t = i / sampleCount;
    const currentHidden = hiddenAt(t);
    if (currentHidden !== runHidden) {
      const edge = refineBoundary((i - 1) / sampleCount, t, runHidden);
      if (runHidden) {
        hiddenRanges.push({ start: runStart, end: edge });
      }
      runStart = edge;
      runHidden = currentHidden;
    }
  }
  if (runHidden) {
    hiddenRanges.push({ start: runStart, end: 1 });
  }

  if (hiddenRanges.length === 0) {
    return [{ start: 0, end: len }];
  }

  const visibleRanges = [];
  let cursor = 0;
  for (const hidden of hiddenRanges) {
    const hs = clamp(hidden.start, 0, 1);
    const he = clamp(hidden.end, 0, 1);
    if (hs - cursor > 1e-5) {
      visibleRanges.push({ start: cursor * len, end: hs * len });
    }
    cursor = Math.max(cursor, he);
  }
  if (1 - cursor > 1e-5) {
    visibleRanges.push({ start: cursor * len, end: len });
  }

  return visibleRanges;
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

  const minorStepPx = minorStep * state.view.zoom;
  const majorStepPx = majorStep * state.view.zoom;
  const tileSize = Math.max(8, Math.min(4096, Math.round(majorStepPx)));
  const quantMinor = Math.round(minorStepPx * 100) / 100;
  const quantMajor = Math.round(majorStepPx * 100) / 100;
  const cacheKey = `${quantMinor}|${quantMajor}|${tileSize}`;

  if (!gridTextureCache.pattern || gridTextureCache.key !== cacheKey) {
    gridTextureCache.key = cacheKey;
    gridTextureCanvas.width = tileSize;
    gridTextureCanvas.height = tileSize;

    if (gridTextureCtx) {
      gridTextureCtx.clearRect(0, 0, tileSize, tileSize);

      const minorRadiusPx = 0.95;
      const majorRadiusPx = 1.35;
      const stepPx = Math.max(1, minorStepPx);

      gridTextureCtx.fillStyle = 'rgba(148, 148, 148, 0.74)';
      for (let x = 0; x <= tileSize + 0.5; x += stepPx) {
        for (let y = 0; y <= tileSize + 0.5; y += stepPx) {
          const onMajorX = Math.abs((x / majorStepPx) - Math.round(x / majorStepPx)) < 0.0001;
          const onMajorY = Math.abs((y / majorStepPx) - Math.round(y / majorStepPx)) < 0.0001;
          if (onMajorX && onMajorY) {
            continue;
          }
          gridTextureCtx.beginPath();
          gridTextureCtx.arc(x, y, minorRadiusPx, 0, Math.PI * 2);
          gridTextureCtx.fill();
        }
      }

      gridTextureCtx.fillStyle = 'rgba(108, 108, 108, 0.92)';
      gridTextureCtx.beginPath();
      gridTextureCtx.arc(0, 0, majorRadiusPx, 0, Math.PI * 2);
      gridTextureCtx.fill();

      gridTextureCache.pattern = ctx.createPattern(gridTextureCanvas, 'repeat');
    }
  }

  if (!gridTextureCache.pattern) {
    return;
  }

  const phaseX = ((state.view.offsetX % majorStepPx) + majorStepPx) % majorStepPx;
  const phaseY = ((state.view.offsetY % majorStepPx) + majorStepPx) % majorStepPx;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, phaseX, phaseY);
  ctx.fillStyle = gridTextureCache.pattern;
  ctx.fillRect(-majorStepPx, -majorStepPx, canvas.width + majorStepPx * 2, canvas.height + majorStepPx * 2);
  ctx.restore();
}

function drawTrackLengthOverlay() {
  if (state.mode !== 'track' || !state.draftingTrackStart || !state.mousePreview) {
    return;
  }

  const lengthDot = distance(state.draftingTrackStart, state.mousePreview);
  const startLv = normalizeTrackLevel(state.draftingTrackStartLevel ?? state.settings.trackLevel);
  const endLv = normalizeTrackLevel(state.settings.trackLevel);
  const minLen = getRequiredTrackLength(startLv, endLv);
  const enough = lengthDot >= minLen;
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

function drawCursorMarker(point, options = {}) {
  if (!point) {
    return;
  }

  const {
    hasStart = false,
    strokeIdle = 'rgba(23, 116, 182, 0.95)',
    strokeActive = 'rgba(22, 138, 206, 0.95)',
    fillIdle = 'rgba(45, 136, 197, 0.92)',
    fillActive = 'rgba(58, 164, 223, 0.92)',
    baseRadius = 0.62,
    activeRadius = 0.56,
    innerIdle = 0.2,
    innerActive = 0.16,
    lineScale = 1.5,
    lineMin = 0.14,
    lineMax = 0.5
  } = options;

  const ringLineWidth = clamp(lineScale / Math.max(0.0001, state.view.zoom), lineMin, lineMax);
  const ringRadius = hasStart ? activeRadius : baseRadius;
  const innerRadius = hasStart ? innerActive : innerIdle;

  ctx.strokeStyle = hasStart ? strokeActive : strokeIdle;
  ctx.lineWidth = ringLineWidth;
  ctx.beginPath();
  ctx.arc(point.x, point.y, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = hasStart ? fillActive : fillIdle;
  ctx.beginPath();
  ctx.arc(point.x, point.y, innerRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawTracks(forcedLevel = getActiveTrackLevel(), renderOptions = {}) {
  const trackWorldWidth = getTrackWorldWidth();
  const nodeCounts = collectTrackNodeCounts();
  const allLevels = forcedLevel === null || forcedLevel === undefined;
  const viewLevel = Number.isFinite(Number(renderOptions.viewLevel))
    ? normalizeTrackLevel(renderOptions.viewLevel)
    : (allLevels ? 0 : normalizeTrackLevel(forcedLevel));
  const ghostInTrackEdit = renderOptions.ghostInTrackEdit === true;
  const otherLevelAlpha = Number.isFinite(Number(renderOptions.otherLevelAlpha))
    ? clamp(Number(renderOptions.otherLevelAlpha), 0, 1)
    : 0.22;
  const strictSingleLevel = renderOptions.strictSingleLevel === true;
  const isEditingPass = !ghostInTrackEdit && (allLevels || viewLevel === getActiveTrackLevel());
  const showTrackPreviewOverlay = state.mode === 'track' && (isEditingPass || ghostInTrackEdit);
  const showTrackSelectionOverlay = isEditingPass;
  const getSegAssignedLevel = (seg) => normalizeTrackLevel(
    Math.max(getTrackEndpointLevel(seg, 'a'), getTrackEndpointLevel(seg, 'b'))
  );
  const shouldRenderSeg = (seg) => {
    if (allLevels) {
      return true;
    }
    if (strictSingleLevel) {
      return getSegAssignedLevel(seg) === viewLevel;
    }
    return trackTouchesLevel(seg, viewLevel);
  };
  const getSegAlpha = (seg) => {
    if (allLevels) {
      if (ghostInTrackEdit) {
        return trackTouchesLevel(seg, viewLevel) ? 1 : otherLevelAlpha;
      }
      return 1;
    }
    return getTrackLevelVisualAlpha(seg, viewLevel);
  };
  const sideRailSuppression = buildSideRailSuppressionMap();
  const visibleRangesPerTrack = state.tracks.map((seg) => getTrackVisibleDistanceRanges(seg));
  const useGpuTrackBody = isGpuTrackRenderingEnabled();
  const gpuTrackBodyWidthPx = getTrackWorldWidth() * state.view.zoom;

  // Draw elevated side rails first so result looks like: outer-line < track > outer-line.
  for (let i = 0; i < state.tracks.length; i += 1) {
    const seg = state.tracks[i];
    if (!shouldRenderSeg(seg)) {
      continue;
    }
    drawTrackSideLines(seg, null, null, getSegAlpha(seg), {
      ...(sideRailSuppression.get(i) || {}),
      visibleRanges: visibleRangesPerTrack[i]
    });
  }

  ctx.lineWidth = trackWorldWidth;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (let i = 0; i < state.tracks.length; i += 1) {
    const seg = state.tracks[i];
    if (!shouldRenderSeg(seg)) {
      continue;
    }
    const visibleRanges = visibleRangesPerTrack[i];
    if (!visibleRanges || visibleRanges.length === 0) {
      continue;
    }

    const dx = seg.b.x - seg.a.x;
    const dy = seg.b.y - seg.a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      continue;
    }
    const ux = dx / len;
    const uy = dy / len;

    const segAlpha = getSegAlpha(seg);
    const segLineType = normalizeTrackLineType(seg.lineType);
    const useGpuForSeg = useGpuTrackBody && segLineType === 'solid';

    if (!useGpuForSeg) {
      ctx.globalAlpha = TRACK_BODY_ALPHA * segAlpha;
      applyTrackLineStyle(seg);
    }
    for (const range of visibleRanges) {
      const startDist = Math.max(0, Math.min(len, Number(range.start)));
      const endDist = Math.max(0, Math.min(len, Number(range.end)));
      if (endDist - startDist <= 1e-6) {
        continue;
      }
      const startPoint = { x: seg.a.x + ux * startDist, y: seg.a.y + uy * startDist };
      const endPoint = { x: seg.a.x + ux * endDist, y: seg.a.y + uy * endDist };
      if (useGpuForSeg) {
        enqueueGpuTrackSegment(startPoint, endPoint, seg.color, TRACK_BODY_ALPHA * segAlpha, gpuTrackBodyWidthPx);
      } else {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    }
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Keep rounded appearance at branch/connection nodes only.
  const joinRadius = trackWorldWidth * 0.51;
  for (const seg of state.tracks) {
    if (!shouldRenderSeg(seg)) {
      continue;
    }
    const segAlpha = getSegAlpha(seg);
    if (segAlpha <= 0.001) {
      continue;
    }
    const aCount = nodeCounts.get(trackNodeKey(seg.a, getTrackEndpointLevel(seg, 'a'))) || 0;
    const bCount = nodeCounts.get(trackNodeKey(seg.b, getTrackEndpointLevel(seg, 'b'))) || 0;
    const aBaseLevel = getTrackEndpointLevel(seg, 'a');
    const bBaseLevel = getTrackEndpointLevel(seg, 'b');
    if (aCount >= 2) {
      drawTrackJoinCircle(
        seg.a,
        joinRadius,
        aBaseLevel,
        normalizeTrackColor(seg.color),
        TRACK_BODY_ALPHA * segAlpha
      );
    }
    if (bCount >= 2) {
      drawTrackJoinCircle(
        seg.b,
        joinRadius,
        bBaseLevel,
        normalizeTrackColor(seg.color),
        TRACK_BODY_ALPHA * segAlpha
      );
    }
  }
  ctx.globalAlpha = 1;

  const markerLevel = (allLevels && ghostInTrackEdit) ? viewLevel : (allLevels ? null : viewLevel);
  drawLevelCrossingHints(markerLevel, visibleRangesPerTrack);
  drawDeadEndMarkers(nodeCounts, markerLevel);

  if (showTrackPreviewOverlay && state.draftingTrackStart) {
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

  if (showTrackPreviewOverlay && state.mousePreview) {
    const ringLineWidth = clamp(1.6 / Math.max(0.0001, state.view.zoom), 0.14, 0.5);
    const ringRadius = Math.max(0.05, CLEARANCE_HALF_WIDTH_DOT - ringLineWidth / 2);
    drawCursorMarker(state.mousePreview, {
      hasStart: Boolean(state.draftingTrackStart),
      baseRadius: ringRadius,
      activeRadius: ringRadius,
      innerIdle: 0.34,
      innerActive: 0.28,
      lineScale: 1.6,
      lineMin: 0.14,
      lineMax: 0.5
    });
  }

  if (showTrackSelectionOverlay && state.selection && state.selection.type === 'track') {
    const seg = state.tracks[state.selection.index];
    if (seg) {
      const dx = seg.b.x - seg.a.x;
      const dy = seg.b.y - seg.a.y;
      const len = Math.hypot(dx, dy);
      if (len >= 1e-6) {
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;
        const frameHalf = (getTrackWorldWidth() * 0.5) + clamp(1.4 / Math.max(0.0001, state.view.zoom), 0.12, 0.5);
        const framePad = clamp(1.2 / Math.max(0.0001, state.view.zoom), 0.1, 0.42);

        const p1 = { x: seg.a.x - ux * framePad + nx * frameHalf, y: seg.a.y - uy * framePad + ny * frameHalf };
        const p2 = { x: seg.b.x + ux * framePad + nx * frameHalf, y: seg.b.y + uy * framePad + ny * frameHalf };
        const p3 = { x: seg.b.x + ux * framePad - nx * frameHalf, y: seg.b.y + uy * framePad - ny * frameHalf };
        const p4 = { x: seg.a.x - ux * framePad - nx * frameHalf, y: seg.a.y - uy * framePad - ny * frameHalf };

        ctx.strokeStyle = 'rgba(10, 130, 220, 0.95)';
        ctx.lineWidth = clamp(1.6 / Math.max(0.0001, state.view.zoom), 0.12, 0.5);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  if (showTrackSelectionOverlay && state.selection && state.selection.type === 'track-side') {
    const seg = state.tracks[state.selection.index];
    if (seg) {
      const dx = seg.b.x - seg.a.x;
      const dy = seg.b.y - seg.a.y;
      const len = Math.hypot(dx, dy);
      if (len >= 1e-6) {
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;
        const sideSign = state.selection.side === 'negative' ? -1 : 1;
        const offset = getTrackSideOffset(seg) * sideSign;
        const visibleRanges = visibleRangesPerTrack[state.selection.index] || [{ start: 0, end: len }];
        const hiWidth = clamp(2.0 / Math.max(0.0001, state.view.zoom), 0.15, 0.56);

        ctx.strokeStyle = 'rgba(24, 155, 245, 0.96)';
        ctx.lineWidth = hiWidth;
        ctx.lineCap = 'round';
        ctx.setLineDash([0.45, 0.3]);

        for (const range of visibleRanges) {
          const s = Math.max(0, Math.min(len, Number(range.start)));
          const e = Math.max(0, Math.min(len, Number(range.end)));
          if (e - s <= 1e-6) {
            continue;
          }
          ctx.beginPath();
          ctx.moveTo(seg.a.x + ux * s + nx * offset, seg.a.y + uy * s + ny * offset);
          ctx.lineTo(seg.a.x + ux * e + nx * offset, seg.a.y + uy * e + ny * offset);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }
  }

  if (state.mode === 'viaduct' && state.mousePreview) {
    const isErase = state.settings.viaductWallAction === 'erase';
    drawCursorMarker(state.mousePreview, {
      hasStart: Boolean(state.draftingViaductStart),
      strokeIdle: isErase ? 'rgba(166, 48, 48, 0.96)' : 'rgba(16, 16, 16, 0.9)',
      strokeActive: isErase ? 'rgba(186, 58, 58, 0.96)' : 'rgba(28, 28, 28, 0.95)',
      fillIdle: isErase ? 'rgba(211, 102, 102, 0.9)' : 'rgba(62, 62, 62, 0.86)',
      fillActive: isErase ? 'rgba(226, 118, 118, 0.92)' : 'rgba(84, 84, 84, 0.9)',
      baseRadius: 0.6,
      activeRadius: 0.56,
      innerIdle: 0.18,
      innerActive: 0.16,
      lineScale: 1.45,
      lineMin: 0.13,
      lineMax: 0.42
    });
  }
}

function drawTrackClearance() {
  const dashOn = 6 / state.view.zoom;
  const dashOff = 4 / state.view.zoom;
  const lineWidth = clamp(1.2 / state.view.zoom, 0.09, 0.4);
  const useGpuTrackRendering = isGpuTrackRenderingEnabled();
  const lineWidthPx = lineWidth * state.view.zoom;
  const clearanceColor = '#2391cd';
  const clearanceAlpha = 0.72;

  if (!useGpuTrackRendering) {
    ctx.strokeStyle = 'rgba(35, 145, 205, 0.72)';
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([dashOn, dashOff]);
    ctx.lineCap = 'round';
  }

  for (const seg of state.tracks) {
    const segAlpha = isAvailableMode() ? 1 : getTrackLevelVisualAlpha(seg);
    if (!useGpuTrackRendering) {
      ctx.globalAlpha = segAlpha;
    }
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

    const plusA = { x: seg.a.x + ox, y: seg.a.y + oy };
    const plusB = { x: seg.b.x + ox, y: seg.b.y + oy };
    const minusA = { x: seg.a.x - ox, y: seg.a.y - oy };
    const minusB = { x: seg.b.x - ox, y: seg.b.y - oy };

    if (useGpuTrackRendering) {
      const alpha = clearanceAlpha * segAlpha;
      enqueueGpuDashedLine(plusA, plusB, dashOn, dashOff, clearanceColor, alpha, lineWidthPx);
      enqueueGpuDashedLine(minusA, minusB, dashOn, dashOff, clearanceColor, alpha, lineWidthPx);
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(plusA.x, plusA.y);
    ctx.lineTo(plusB.x, plusB.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(minusA.x, minusA.y);
    ctx.lineTo(minusB.x, minusB.y);
    ctx.stroke();
  }

  if (!useGpuTrackRendering) {
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }
}

function drawPlatforms() {
  const platformWorldWidth = getPlatformWorldWidth();
  const useGpuTrackRendering = isGpuTrackRenderingEnabled();
  const platformWidthPx = platformWorldWidth * state.view.zoom;
  const platformSegments = getPlatformSegments();
  const visibleRangesByPlatform = new Map();
  const polygonSeedSegments = [];
  for (const seg of platformSegments) {
    const ranges = getPlatformVisibleDistanceRanges(seg);
    visibleRangesByPlatform.set(seg, ranges);
    if (ranges.length === 1) {
      const fullLen = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y);
      if (Math.abs(ranges[0].start) <= 1e-4 && Math.abs(ranges[0].end - fullLen) <= 1e-4) {
        polygonSeedSegments.push(seg);
      }
    }
  }
  const platformPolygons = buildPlatformFillPolygons(polygonSeedSegments);

  // Fill enclosed platform areas when segment loops form a polygon.
  if (useGpuTrackRendering) {
    for (const poly of platformPolygons) {
      enqueueGpuPolygonFill(poly, '#8a8a8a', 0.34);
    }
  } else {
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
  }

  for (const p of state.platforms) {
    if (p.a && p.b) {
      const visibleRanges = visibleRangesByPlatform.get(p) || getPlatformVisibleDistanceRanges(p);
      if (visibleRanges.length === 0) {
        continue;
      }

      const dx = p.b.x - p.a.x;
      const dy = p.b.y - p.a.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) {
        continue;
      }
      const ux = dx / len;
      const uy = dy / len;

      if (!useGpuTrackRendering) {
        ctx.strokeStyle = '#8a8a8a';
        ctx.lineWidth = platformWorldWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }

      const platformLevel = getPlatformLevel(p);
      for (const range of visibleRanges) {
        const startDist = Math.max(0, Math.min(len, Number(range.start)));
        const endDist = Math.max(0, Math.min(len, Number(range.end)));
        if (endDist - startDist <= 1e-6) {
          continue;
        }
        const a = { x: p.a.x + ux * startDist, y: p.a.y + uy * startDist };
        const b = { x: p.a.x + ux * endDist, y: p.a.y + uy * endDist };
        if (useGpuTrackRendering) {
          enqueueGpuTrackSegment(a, b, '#8a8a8a', 1, platformWidthPx, platformLevel);
        } else {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      continue;
    }

    // Legacy rectangular platform compatibility.
    if (useGpuTrackRendering) {
      enqueueGpuPolygonFill([
        { x: p.x, y: p.y },
        { x: p.x + p.w, y: p.y },
        { x: p.x + p.w, y: p.y + p.h },
        { x: p.x, y: p.y + p.h }
      ], '#8a8a8a', 1);
    } else {
      ctx.fillStyle = '#8a8a8a';
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
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
        const visibleRanges = visibleRangesByPlatform.get(p) || getPlatformVisibleDistanceRanges(p);
        const dx = p.b.x - p.a.x;
        const dy = p.b.y - p.a.y;
        const len = Math.hypot(dx, dy);
        if (len >= 1e-6) {
          const ux = dx / len;
          const uy = dy / len;
          for (const range of visibleRanges) {
            const startDist = Math.max(0, Math.min(len, Number(range.start)));
            const endDist = Math.max(0, Math.min(len, Number(range.end)));
            if (endDist - startDist <= 1e-6) {
              continue;
            }
            ctx.beginPath();
            ctx.moveTo(p.a.x + ux * startDist, p.a.y + uy * startDist);
            ctx.lineTo(p.a.x + ux * endDist, p.a.y + uy * endDist);
            ctx.stroke();
          }
        }
      } else {
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }
      ctx.setLineDash([]);
    }
  }

}

function trainLocalToWorld(train, lx, ly) {
  const sin = Math.sin(train.angle || 0);
  const cos = Math.cos(train.angle || 0);
  return {
    x: train.x + lx * cos - ly * sin,
    y: train.y + lx * sin + ly * cos
  };
}

function buildTrainRectPolygon(train, x, y, w, h) {
  return [
    trainLocalToWorld(train, x, y),
    trainLocalToWorld(train, x + w, y),
    trainLocalToWorld(train, x + w, y + h),
    trainLocalToWorld(train, x, y + h)
  ];
}

function drawTrainGpu(train) {
  const spacing = TRAIN_DIM.carLengthDot + TRAIN_DIM.carGapDot;
  const carW = TRAIN_DIM.carLengthDot;
  const carH = TRAIN_DIM.carHeightDot;
  const strokeWidthPx = 0.26 * state.view.zoom;

  for (let i = 0; i < train.cars; i += 1) {
    const cx = i * spacing;
    const carPoly = buildTrainRectPolygon(train, cx, -carH / 2, carW, carH);
    enqueueGpuPolygonFill(carPoly, '#f2a386', 1);

    for (let j = 0; j < 4; j += 1) {
      const a = carPoly[j];
      const b = carPoly[(j + 1) % 4];
      enqueueGpuTrackSegment(a, b, '#ef7f50', 1, strokeWidthPx);
    }
  }

  // Front icon-like head
  enqueueGpuPolygonFill(buildTrainRectPolygon(train, -6, -TRAIN_DIM.headHeightDot / 2, TRAIN_DIM.headWidthDot, TRAIN_DIM.headHeightDot), '#151515', 1);
  enqueueGpuPolygonFill(buildTrainRectPolygon(train, -4.5, -10.5, 24, 9.2), '#f4f4f4', 1);
  enqueueGpuPolygonFill(buildTrainRectPolygon(train, -3.7, -8.7, 21, 5.4), '#5cc7ff', 1);
  enqueueGpuPolygonFill(buildTrainRectPolygon(train, -4.5, 2.2, 24, 10.2), '#3f3f3f', 1);
}

function drawTrainCpu(train) {
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

function drawTrain(train) {
  if (isGpuTrackRenderingEnabled()) {
    drawTrainGpu(train);
    return;
  }
  drawTrainCpu(train);
}

function drawTrainSelectionHighlightGpu(train) {
  const spacing = TRAIN_DIM.carLengthDot + TRAIN_DIM.carGapDot;
  const totalLen = Math.max(spacing, train.cars * spacing + 8);
  const x = -8;
  const y = -TRAIN_DIM.headHeightDot / 2 - 2;
  const w = totalLen;
  const h = TRAIN_DIM.headHeightDot + 4;
  const p1 = trainLocalToWorld(train, x, y);
  const p2 = trainLocalToWorld(train, x + w, y);
  const p3 = trainLocalToWorld(train, x + w, y + h);
  const p4 = trainLocalToWorld(train, x, y + h);
  const hiWidthPx = 0.25 * state.view.zoom;

  enqueueGpuDashedLine(p1, p2, 0.7, 0.45, '#0a82dc', 0.95, hiWidthPx);
  enqueueGpuDashedLine(p2, p3, 0.7, 0.45, '#0a82dc', 0.95, hiWidthPx);
  enqueueGpuDashedLine(p3, p4, 0.7, 0.45, '#0a82dc', 0.95, hiWidthPx);
  enqueueGpuDashedLine(p4, p1, 0.7, 0.45, '#0a82dc', 0.95, hiWidthPx);
}

function drawTrainSelectionHighlightCpu(train) {
  ctx.save();
  ctx.translate(train.x, train.y);
  ctx.rotate(train.angle);
  ctx.strokeStyle = 'rgba(10, 130, 220, 0.95)';
  ctx.lineWidth = 0.25;
  ctx.setLineDash([0.7, 0.45]);
  const spacing = TRAIN_DIM.carLengthDot + TRAIN_DIM.carGapDot;
  const totalLen = Math.max(spacing, train.cars * spacing + 8);
  ctx.strokeRect(-8, -TRAIN_DIM.headHeightDot / 2 - 2, totalLen, TRAIN_DIM.headHeightDot + 4);
  ctx.setLineDash([]);
  ctx.restore();
}

function getTrainLevel(train) {
  if (Number.isFinite(Number(train.level))) {
    return normalizeTrackLevel(train.level);
  }

  const pr = closestTrackProjection(train);
  if (!pr || !pr.seg || pr.dist > 1.5) {
    return 0;
  }
  return getTrackLevelAt(pr.seg, pr.t);
}

function isTrainUnderHigherViaduct(train, trainLevel) {
  const spacing = TRAIN_DIM.carLengthDot + TRAIN_DIM.carGapDot;
  const sin = Math.sin(train.angle || 0);
  const cos = Math.cos(train.angle || 0);
  const probe = (lx, ly = 0) => ({
    x: train.x + lx * cos - ly * sin,
    y: train.y + lx * sin + ly * cos
  });

  if (isPointInsideHigherViaductArea(probe(-1.2), trainLevel)) {
    return true;
  }

  for (let i = 0; i < train.cars; i += 1) {
    const cx = i * spacing + TRAIN_DIM.carLengthDot * 0.5;
    if (isPointInsideHigherViaductArea(probe(cx), trainLevel)) {
      return true;
    }
  }

  const tailX = Math.max(0, train.cars * spacing - TRAIN_DIM.carGapDot);
  return isPointInsideHigherViaductArea(probe(tailX), trainLevel);
}

function drawTrains() {
  const useGpuTrackRendering = isGpuTrackRenderingEnabled();
  for (let i = 0; i < state.trains.length; i += 1) {
    const tr = state.trains[i];
    const trainLevel = getTrainLevel(tr);
    tr.level = trainLevel;
    if (isTrainUnderHigherViaduct(tr, trainLevel)) {
      continue;
    }

    drawTrain(tr);
    if (state.selection && state.selection.type === 'train' && state.selection.index === i) {
      if (useGpuTrackRendering) {
        drawTrainSelectionHighlightGpu(tr);
      } else {
        drawTrainSelectionHighlightCpu(tr);
      }
    }
  }
}

function drawTrackLevelPass(level) {
  const allLevels = level === null || level === undefined;
  const trackEditGhostMode = state.mode === 'track' && !allLevels;
  if (allLevels) {
    // True layering pass: lower levels first, higher levels later.
    for (let lv = -TRACK_MAX_LEVEL; lv <= TRACK_MAX_LEVEL; lv += 1) {
      if (state.mode === 'viaduct-area' || state.layers.track) {
        drawViaductAreas(lv);
      }
      if (state.layers.track) {
        drawTracks(lv, { strictSingleLevel: true });
        drawViaductWalls(lv);
      }
    }
    return;
  }

  if (trackEditGhostMode) {
    const activeLevel = getActiveTrackLevel();
    if (state.mode === 'viaduct-area' || state.layers.track) {
      drawViaductAreas(activeLevel);
    }
    if (state.layers.track) {
      drawTracks(null, {
        ghostInTrackEdit: true,
        viewLevel: activeLevel,
        otherLevelAlpha: 0.22
      });
      drawViaductWalls(activeLevel);
    }
    return;
  }

  const lv = normalizeTrackLevel(level);
  if (state.mode === 'viaduct-area' || state.layers.track) {
    drawViaductAreas(lv);
  }
  if (state.layers.track) {
    drawTracks(lv);
    drawViaductWalls(lv);
  }
}

function render() {
  resetGpuTrackVertices();
  syncGpuCanvasSize();
  if (gpu.enabled && gpu.gl) {
    gpu.gl.viewport(0, 0, gpuCanvas.width, gpuCanvas.height);
    rebuildGpuMaskTexture();
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PAPER_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.setTransform(state.view.zoom, 0, 0, state.view.zoom, state.view.offsetX, state.view.offsetY);
  if (state.layers.grid) {
    drawGrid();
  }
  if (state.layers.clearance) {
    drawTrackClearance();
  }
  drawTrackLevelPass(isAvailableMode() ? null : getActiveTrackLevel());
  if (state.layers.platform) {
    drawPlatforms();
  }
  if (state.layers.train) {
    drawTrains();
  }
  ctx.restore();
  drawGpuTrackSegments();
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
    countStat.textContent = `T${state.tracks.length} V${state.viaductWalls.length} A${state.viaductAreas.length} P${state.platforms.length} R${state.trains.length}`;
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

  for (let i = state.viaductWalls.length - 1; i >= 0; i -= 1) {
    const wall = state.viaductWalls[i];
    const pr = nearestPointOnSegment(point, wall.a, wall.b);
    if (pr.dist < 0.8) {
      state.viaductWalls.splice(i, 1);
      return true;
    }
  }

  for (let i = state.viaductAreas.length - 1; i >= 0; i -= 1) {
    const area = state.viaductAreas[i];
    const poly = normalizeAreaPoints(area);
    if (pointInPolygon(point, poly)) {
      state.viaductAreas.splice(i, 1);
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
    const priority = type === 'track' ? 0 : type === 'viaduct' ? 1 : type === 'viaduct-area' ? 2 : type === 'platform' ? 3 : 4;
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

  const viaductPickRadius = clamp(6 / Math.max(0.0001, state.view.zoom), 0.16, 0.7);
  for (let i = 0; i < state.viaductWalls.length; i += 1) {
    const wall = state.viaductWalls[i];
    const wallLv = normalizeTrackLevel(wall.level);
    const visible = wallLv === getActiveTrackLevel();
    if (!visible) {
      continue;
    }
    const pr = nearestPointOnSegment(point, wall.a, wall.b);
    pushCandidate('viaduct', i, pr.dist, viaductPickRadius);
  }

  if (state.mode === 'viaduct-area') {
    for (let i = 0; i < state.viaductAreas.length; i += 1) {
      const area = state.viaductAreas[i];
      if (normalizeTrackLevel(area.level) !== getActiveTrackLevel()) {
        continue;
      }
      const inside = pointInPolygon(point, normalizeAreaPoints(area));
      if (inside) {
        pushCandidate('viaduct-area', i, 0, 1);
      }
    }
  }

  // Track picks are based on centerline nearest distance.
  const trackPickRadius = clamp(7 / Math.max(0.0001, state.view.zoom), 0.18, 0.8);
  const activeLevel = getActiveTrackLevel();
  for (let i = 0; i < state.tracks.length; i += 1) {
    const seg = state.tracks[i];
    const pr = nearestPointOnSegment(point, seg.a, seg.b);
    const onActiveLevel = trackTouchesLevel(seg, activeLevel);
    if (onActiveLevel) {
      pushCandidate('track', i, pr.dist, trackPickRadius);
      continue;
    }

    // Fallback for select mode: allow picking other-level tracks with lower priority.
    if (state.mode === 'select') {
      const penalty = trackPickRadius * 0.65;
      pushCandidate('track', i, pr.dist + penalty, trackPickRadius + penalty);
    }
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

  if (state.selection.type === 'viaduct') {
    const wall = state.viaductWalls[state.selection.index];
    if (!wall) {
      return;
    }
    wall.a.x += dx;
    wall.a.y += dy;
    wall.b.x += dx;
    wall.b.y += dy;
    return;
  }

  if (state.selection.type === 'viaduct-area') {
    const area = state.viaductAreas[state.selection.index];
    if (!area) {
      return;
    }
    const points = normalizeAreaPoints(area).map((p) => ({ x: p.x + dx, y: p.y + dy }));
    area.points = points;
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
  if (state.selection.type === 'viaduct') {
    state.viaductWalls.splice(state.selection.index, 1);
    deleted = true;
  }
  if (state.selection.type === 'track-side') {
    const seg = state.tracks[state.selection.index];
    if (seg) {
      if (state.selection.side === 'negative') {
        seg.sideDisabledNegative = true;
      } else {
        seg.sideDisabledPositive = true;
      }
      deleted = true;
    }
  }
  if (state.selection.type === 'viaduct-area') {
    state.viaductAreas.splice(state.selection.index, 1);
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
    : state.mode === 'viaduct'
      ? (state.settings.viaductWallAction === 'erase'
        ? raw
        : resolveViaductWallPoint(raw, state.draftingViaductStart, {
          enableNodeSnap: !ev.altKey,
          preferWallSnap: false
        }))
    : state.mode === 'viaduct-area'
      ? resolveViaductAreaPoint(raw)
    : state.mode === 'platform'
      ? resolvePlatformPoint(raw, state.draftingPlatformStart, { enableNodeSnap: !ev.altKey })
      : quantizePoint(raw);
  state.mousePreview = p;
  if (state.mode === 'viaduct' && state.draftingViaductStart) {
    state.draftingViaductCurrent = p;
  }
  if (state.mode === 'viaduct-area') {
    if (state.settings.viaductAreaShape === 'poly') {
      if (state.draftingViaductAreaPoints.length > 0) {
        state.draftingViaductAreaCurrent = p;
      }
    } else if (state.draftingViaductAreaStart) {
      state.draftingViaductAreaCurrent = p;
    }
  }
  if (state.mode === 'platform' && state.draftingPlatformStart) {
    state.draftingPlatformCurrent = p;
  }
  requestRender();
});

canvas.addEventListener('mousedown', (ev) => {
  if (ev.button === 2 && state.mode === 'viaduct-area' && state.settings.viaductAreaShape === 'poly') {
    if (state.draftingViaductAreaPoints.length > 0) {
      state.draftingViaductAreaPoints.pop();
      const n = state.draftingViaductAreaPoints.length;
      state.draftingViaductAreaCurrent = n > 0 ? state.draftingViaductAreaPoints[n - 1] : null;
      render();
    }
    return;
  }

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
    : state.mode === 'viaduct'
      ? (state.settings.viaductWallAction === 'erase'
        ? raw
        : resolveViaductWallPoint(raw, state.draftingViaductStart, {
          enableNodeSnap: !ev.altKey,
          preferWallSnap: false
        }))
    : state.mode === 'viaduct-area'
      ? resolveViaductAreaPoint(raw)
    : state.mode === 'platform'
      ? resolvePlatformPoint(raw, state.draftingPlatformStart, { enableNodeSnap: !ev.altKey })
      : quantizePoint(raw);

  if (state.mode === 'track') {
    if (!state.draftingTrackStart) {
      state.draftingTrackStart = p;
      state.draftingTrackStartLevel = normalizeTrackLevel(state.settings.trackLevel);
    } else {
      const startLevel = normalizeTrackLevel(state.draftingTrackStartLevel ?? state.settings.trackLevel);
      const endLevel = normalizeTrackLevel(state.settings.trackLevel);
      const minTrackLength = getRequiredTrackLength(startLevel, endLevel);
      if (distance(state.draftingTrackStart, p) >= minTrackLength) {
        state.tracks.push(buildTrackSegment(state.draftingTrackStart, p, {
          levelStart: startLevel,
          levelEnd: endLevel
        }));
        commitHistory();
      }
      state.draftingTrackStart = null;
      state.draftingTrackStartLevel = null;
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
          b: { x: p.x, y: p.y },
          level: getActiveTrackLevel()
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

  if (state.mode === 'viaduct') {
    if (state.settings.viaductWallAction === 'erase') {
      const bestWall = findNearestViaductWallProjection(p, {
        level: getActiveTrackLevel(),
        allowAnyLevel: false,
        snapRadiusPx: 22
      });
      const bestTrackSide = findNearestTrackSideProjection(p, {
        level: getActiveTrackLevel(),
        allowAnyLevel: false,
        snapRadiusPx: 22
      });

      let nextSelection = null;
      if (bestWall && bestTrackSide) {
        nextSelection = bestWall.score <= bestTrackSide.score
          ? { type: 'viaduct', index: bestWall.index }
          : { type: 'track-side', index: bestTrackSide.index, side: bestTrackSide.side };
      } else if (bestWall) {
        nextSelection = { type: 'viaduct', index: bestWall.index };
      } else if (bestTrackSide) {
        nextSelection = { type: 'track-side', index: bestTrackSide.index, side: bestTrackSide.side };
      }

      state.selection = nextSelection;
      if (!nextSelection) {
        setSaveNotice('VCT: 外側線をクリックしてください', true);
      }
      state.draftingViaductStart = null;
      state.draftingViaductCurrent = null;
      render();
      return;
    }

    if (!state.draftingViaductStart) {
      state.draftingViaductStart = p;
      state.draftingViaductCurrent = p;
    } else {
      if (distance(state.draftingViaductStart, p) >= 0.8) {
        state.viaductWalls.push({
          a: { x: state.draftingViaductStart.x, y: state.draftingViaductStart.y },
          b: { x: p.x, y: p.y },
          level: getActiveTrackLevel(),
          origin: 'manual'
        });
        commitHistory();
      }
      state.draftingViaductStart = p;
      state.draftingViaductCurrent = p;
    }
    render();
    return;
  }

  if (state.mode === 'viaduct-area') {
    if (getActiveTrackLevel() <= 0) {
      setSaveNotice('VAT: Lv1以上で編集してください', true);
      state.draftingViaductAreaStart = null;
      state.draftingViaductAreaCurrent = null;
      state.draftingViaductAreaPoints = [];
      render();
      return;
    }

    if (state.settings.viaductAreaShape === 'poly') {
      const points = state.draftingViaductAreaPoints;
      const closeRadius = clamp(7 / Math.max(0.0001, state.view.zoom), 0.2, 0.8);
      if (points.length >= 3 && distance(p, points[0]) <= closeRadius) {
        if (applyViaductAreaPolygon(points)) {
          commitHistory();
        }
        state.draftingViaductAreaPoints = [];
        state.draftingViaductAreaCurrent = null;
        render();
        return;
      }

      state.draftingViaductAreaPoints.push(p);
      state.draftingViaductAreaCurrent = p;
    } else {
      if (!state.draftingViaductAreaStart) {
        state.draftingViaductAreaStart = p;
        state.draftingViaductAreaCurrent = p;
      } else {
        if (applyViaductAreaRect(state.draftingViaductAreaStart, p)) {
          commitHistory();
        }
        state.draftingViaductAreaStart = null;
        state.draftingViaductAreaCurrent = null;
      }
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
        cars: 4,
        level: pr.seg ? getTrackLevelAt(pr.seg, pr.t) : 0
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
  if (state.tracks.length === 0 && state.viaductWalls.length === 0 && state.viaductAreas.length === 0 && state.platforms.length === 0 && state.trains.length === 0) {
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
  btn.addEventListener('click', () => {
    if (btn.dataset.mode === 'viaduct') {
      setMode(state.settings.viaductEditMode === 'area' ? 'viaduct-area' : 'viaduct');
      return;
    }
    setMode(btn.dataset.mode);
  });
}

function refreshSettingLabels() {
  trackWidthLabel.textContent = `${Math.round(state.settings.trackWidth)}${UNIT_LABEL}`;
  minTrackLenLabel.textContent = `${state.settings.minTrackLength.toFixed(1)}${UNIT_LABEL}`;
  if (viaductSpanLabel) {
    viaductSpanLabel.textContent = `${Math.round(state.settings.viaductSpan)}${UNIT_LABEL}`;
  }
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
  setTrackLevelValue(trackLevelInput.value, { commit: false });
});

if (levelUpBtn) {
  levelUpBtn.addEventListener('click', () => {
    setTrackLevelValue(state.settings.trackLevel + 1, { commit: true });
  });
}

if (levelDownBtn) {
  levelDownBtn.addEventListener('click', () => {
    setTrackLevelValue(state.settings.trackLevel - 1, { commit: true });
  });
}

if (trackGradientSelect) {
  trackGradientSelect.addEventListener('change', () => {
    state.settings.trackGradient = normalizeTrackGradient(trackGradientSelect.value);
    if (applyTrackSettingsToSelection()) {
      commitHistory();
    }
    render();
  });
}

trackLevelInput.addEventListener('change', () => {
  setTrackLevelValue(trackLevelInput.value, { commit: true });
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

if (trackColorInput) {
  // Native color picker only; preset window is opened by the Color button.
}

if (lineColorPanel) {
  lineColorPanel.tabIndex = -1;
  lineColorPanel.addEventListener('mousedown', (ev) => {
    lineColorPanel.focus();
    if (shouldStartLineColorPanelDrag(ev.target)) {
      beginLineColorPanelDrag(ev.clientX, ev.clientY);
    }
  });
}

if (lineColorPanelHandle) {
  lineColorPanelHandle.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    beginLineColorPanelDrag(ev.clientX, ev.clientY);
  });
}

document.addEventListener('mousemove', (ev) => {
  updateLineColorPanelDrag(ev.clientX, ev.clientY);
});

document.addEventListener('mouseup', () => {
  endLineColorPanelDrag();
});

if (toggleLineColorPanelBtn) {
  toggleLineColorPanelBtn.addEventListener('click', () => {
    const nextOpen = !(lineColorPanel && !lineColorPanel.hidden);
    setLineColorPanelOpen(nextOpen);
    if (state.lineColorPanelOpen && lineColorPanel) {
      lineColorPanel.focus();
    }
    renderLineColorPresetList();
  });
}

if (saveLineColorBtn) {
  saveLineColorBtn.addEventListener('click', () => {
    setLineColorPanelOpen(true);
    state.lineColorEditorMode = 'save';
    renderLineColorPresetList();
  });
}

if (renameLineColorBtn) {
  renameLineColorBtn.addEventListener('click', () => {
    syncSelectedLineColorPresetIndex();
    if (state.selectedLineColorPresetIndex < 0) {
      return;
    }
    setLineColorPanelOpen(true);
    state.lineColorEditorMode = 'rename';
    renderLineColorPresetList();
  });
}

if (deleteLineColorBtn) {
  deleteLineColorBtn.addEventListener('click', () => {
    deleteSelectedLineColorPreset();
  });
}

if (renameLineColorSaveBtn) {
  renameLineColorSaveBtn.addEventListener('click', () => {
    if (state.lineColorEditorMode === 'rename') {
      renameSelectedLineColorPreset();
      return;
    }
    saveCurrentLineColorPreset();
  });
}

if (renameLineColorCancelBtn) {
  renameLineColorCancelBtn.addEventListener('click', () => {
    state.lineColorEditorMode = null;
    renderLineColorPresetList();
  });
}

if (renameLineColorInput) {
  renameLineColorInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      if (state.lineColorEditorMode === 'rename') {
        renameSelectedLineColorPreset();
      } else {
        saveCurrentLineColorPreset();
      }
    }
    if (ev.key === 'Escape') {
      ev.preventDefault();
      state.lineColorEditorMode = null;
      renderLineColorPresetList();
    }
  });
}

minTrackLenRange.addEventListener('input', () => {
  state.settings.minTrackLength = Number(minTrackLenRange.value);
  refreshSettingLabels();
});

if (viaductSpanRange) {
  viaductSpanRange.addEventListener('input', () => {
    state.settings.viaductSpan = clamp(Number(viaductSpanRange.value), 4, 80);
    refreshSettingLabels();
    render();
  });
}

if (viaductWallActionDrawBtn) {
  viaductWallActionDrawBtn.addEventListener('click', () => {
    state.settings.viaductWallAction = 'draw';
    state.draftingViaductStart = null;
    state.draftingViaductCurrent = null;
    syncViaductActionButtons();
    updateModeGuide(state.mode);
    render();
  });
}

if (viaductWallActionEraseBtn) {
  viaductWallActionEraseBtn.addEventListener('click', () => {
    state.settings.viaductWallAction = 'erase';
    state.draftingViaductStart = null;
    state.draftingViaductCurrent = null;
    syncViaductActionButtons();
    updateModeGuide(state.mode);
    render();
  });
}

if (viaductAreaModePaintBtn) {
  viaductAreaModePaintBtn.addEventListener('click', () => {
    state.settings.viaductAreaMode = 'paint';
    syncViaductActionButtons();
    updateModeGuide(state.mode);
    render();
  });
}

if (viaductAreaModeEraseBtn) {
  viaductAreaModeEraseBtn.addEventListener('click', () => {
    state.settings.viaductAreaMode = 'erase';
    syncViaductActionButtons();
    updateModeGuide(state.mode);
    render();
  });
}

if (viaductAreaShapeSelect) {
  viaductAreaShapeSelect.addEventListener('change', () => {
    state.settings.viaductAreaShape = 'poly';
    viaductAreaShapeSelect.value = 'poly';
    state.draftingViaductAreaStart = null;
    state.draftingViaductAreaCurrent = null;
    state.draftingViaductAreaPoints = [];
    updateModeGuide(state.mode);
    render();
  });
}

if (viaductWallEditBtn) {
  viaductWallEditBtn.addEventListener('click', () => {
    state.settings.viaductEditMode = 'wall';
    setMode('viaduct');
  });
}

if (viaductAreaEditBtn) {
  viaductAreaEditBtn.addEventListener('click', () => {
    state.settings.viaductEditMode = 'area';
    setMode('viaduct-area');
  });
}

window.addEventListener('keydown', (ev) => {
  if (isTitleVisible()) {
    return;
  }

  if (ev.key === 'PageUp') {
    ev.preventDefault();
    setTrackLevelValue(state.settings.trackLevel + 1, { commit: true });
    return;
  }

  if (ev.key === 'PageDown') {
    ev.preventDefault();
    setTrackLevelValue(state.settings.trackLevel - 1, { commit: true });
    return;
  }

  const mod = ev.ctrlKey || ev.metaKey;
  const key = ev.key.toLowerCase();

  if (state.mode === 'viaduct-area' && state.settings.viaductAreaShape === 'poly' && mod && !ev.altKey && key === 'z' && !ev.shiftKey) {
    if (state.draftingViaductAreaPoints.length > 0) {
      state.draftingViaductAreaPoints.pop();
      const n = state.draftingViaductAreaPoints.length;
      state.draftingViaductAreaCurrent = n > 0 ? state.draftingViaductAreaPoints[n - 1] : null;
      render();
      ev.preventDefault();
      return;
    }
  }

  if (mod && !ev.altKey && key === 'z' && !ev.shiftKey) {
    ev.preventDefault();
    undo();
    return;
  }

  if (mod && !ev.altKey && key === 's') {
    ev.preventDefault();
    quickSaveToLocal();
    return;
  }

  if (mod && !ev.altKey && (key === 'y' || (key === 'z' && ev.shiftKey))) {
    ev.preventDefault();
    redo();
    return;
  }

  if (ev.key === 'Escape') {
    if (lineColorPanel && !lineColorPanel.hidden) {
      ev.preventDefault();
      setLineColorPanelOpen(false);
      renderLineColorPresetList();
      return;
    }

    if (state.mode !== 'available') {
      setMode('available');
      return;
    }
    state.draftingTrackStart = null;
    state.draftingTrackStartLevel = null;
    state.draftingViaductStart = null;
    state.draftingViaductCurrent = null;
    state.draftingViaductAreaStart = null;
    state.draftingViaductAreaCurrent = null;
    state.draftingViaductAreaPoints = [];
    state.draftingPlatformStart = null;
    state.draftingPlatformCurrent = null;
    state.draggingSelection = false;
    state.lastDragWorld = null;
    render();
  }

  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    if ((state.mode === 'select' && state.selection)
      || (state.mode === 'viaduct' && state.settings.viaductWallAction === 'erase' && (state.selection?.type === 'viaduct' || state.selection?.type === 'track-side'))) {
      ev.preventDefault();
      deleteSelection();
      render();
    }
  }

  if (state.mode === 'viaduct-area' && state.settings.viaductAreaShape === 'poly' && ev.key === 'Enter') {
    if (state.draftingViaductAreaPoints.length >= 3) {
      if (applyViaductAreaPolygon(state.draftingViaductAreaPoints)) {
        commitHistory();
      }
      state.draftingViaductAreaPoints = [];
      state.draftingViaductAreaCurrent = null;
      render();
    }
    ev.preventDefault();
    return;
  }

  if (ev.key.toLowerCase() === 'l') {
    layerPanel.hidden = !layerPanel.hidden;
    layerMenuBtn.classList.toggle('active', !layerPanel.hidden);
  }
});

window.addEventListener('resize', () => {
  syncGpuCanvasSize();
  if (gpu.enabled && gpu.gl) {
    gpu.gl.viewport(0, 0, gpuCanvas.width, gpuCanvas.height);
  }
  render();
});

// Start with a composition close to the sample image scale.
resetViewToDefault();
initGpuLayer();
loadLineColorPresetsFromLocal();
renderLineColorPresetList();
commitHistory();
refreshSettingLabels();
syncViaductActionButtons();
updateModeGuide(state.mode);
updateModeSettingVisibility(state.mode);
updateViaductEditSwitch(state.mode);
render();
if (titleScreen) {
  titleScreen.hidden = false;
  showTitleMain();
}
