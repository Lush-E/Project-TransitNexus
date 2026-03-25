# Project-TransitNexus

TransitNexus is an Electron + Canvas based 2D rail diagram editor prototype.

## Current Status (2026-03-25)

- UI theme updated to dark header + white dot-grid canvas
- Track drafting, platform drafting, train placement, selection/move/delete implemented
- Undo/Redo and layer visibility toggles implemented
- Save flow implemented:
  - QSV: Quick save to localStorage
  - SAV: Export current state to JSON
  - LOD: Load from JSON file
  - Title menu "Continue": load last selected save, fallback to QSV
- Platform fill improved (loop detection with tolerant node matching)
- Dead-end marker implemented and improved:
  - Marker length: +/-1.5u
  - Marker thickness: same as platform line thickness
  - Marker color: follows each track color
  - Mid-segment branch connections are treated as connected (not dead-end)
- Viaduct editing split into two modes:
  - VCT: viaduct wall line editing
  - VAT: viaduct area editing (Paint / Erase)
- VAT uses polygon boundary drafting:
  - Click to add boundary points (3+)
  - Click first point or press Enter to commit
- Auto-merge for adjacent rectangle areas on the same level
- Save schema migrated to version 11

## Project Files

- app.js: core logic (state, input, draw, save/load, title flow)
- index.html: UI structure
- styles.css: UI styles
- electron-main.js: Electron BrowserWindow bootstrap
- save/: sample save data

## Run

1. Install dependencies

```bash
npm install
```

2. Start app

```bash
npm run start
```

or run `launcher.bat` on Windows.

## Controls (Main)

- Mouse wheel: zoom
- Right drag / middle drag: pan
- Select mode: click to select, drag to move, Delete to remove
- Track mode: 2-click segment placement
- Platform mode: chained segment placement
- Viaduct Wall mode (VCT): chained segment placement
- Viaduct Area mode (VAT):
  - Paint/Erase switch in settings
  - Shape switch: Rectangle / Polygon
  - Rectangle: 2-click area commit
  - Polygon: click multiple vertices then press Enter
  - Polygon draft: right click to remove the last vertex
  - Polygon draft: Ctrl+Z also removes the last vertex (drafting only)
- Ctrl+Z / Ctrl+Y: undo/redo
- Ctrl+S: quick save

## Save Data Notes

- Current schema version: 11
- Unit label: `u`
- Older saves are normalized on load:
  - minTrackLength migration
  - track color/lineType/level normalization
  - topology normalization for branch connectivity (endpoint merge + interior snap)
  - auto-generated elevated side walls are removed from legacy viaduct wall saves
  - viaduct area data normalized to polygon format
  - platform level normalization (missing level -> 0)
  - train level normalization (missing level -> 0)

## Known Next Tasks

- Build explicit rail graph for train routing (node-edge graph)
- Add junction direction rules and pathfinding for trains
- Add hover highlights for selectable candidate tracks
- Add visual debug toggle for graph nodes/endpoints

## Handover

For the latest implementation details and continuation checklist, see:

- docs/HANDOVER_2026-03-25.md
