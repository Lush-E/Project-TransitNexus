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
- Save schema migrated to version 5

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
- Ctrl+Z / Ctrl+Y: undo/redo
- Ctrl+S: quick save

## Save Data Notes

- Current schema version: 5
- Unit label: `u`
- Older saves are normalized on load:
  - minTrackLength migration
  - track color/lineType/level normalization
  - topology normalization for branch connectivity (endpoint merge + interior snap)

## Known Next Tasks

- Build explicit rail graph for train routing (node-edge graph)
- Add junction direction rules and pathfinding for trains
- Add hover highlights for selectable candidate tracks
- Add visual debug toggle for graph nodes/endpoints

## Handover

For the latest implementation details and continuation checklist, see:

- docs/HANDOVER_2026-03-25.md
