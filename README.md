# Project TransitNexus

A desktop-ready 2D railway sandbox where you can draw routes, place stations, build a simple diagram, and run train icons on your own line.

## Run (Windows / PowerShell)

1. Install dependencies:
   ```bash
   npm.cmd install
   ```
2. Start app:
   ```bash
   npm.cmd start
   ```

## Launcher

Double-click `launcher.bat` to open a menu launcher.

- `[1]` Start app
- `[2]` Update and start (`git pull -> npm install -> npm start`)
- `[3]` Install dependencies only
- `[4]` Exit

## MVP Features (Current)

- Draw route segments in canvas
- Place stations on nearest track position
- Add a simple timetable per train
- Run train icon along route based on simulation time

## Controls

- Mode `Track`: left-click to add route points; right-click to finish current polyline.
- Mode `Track`: start/end selection with left-click, then double-click to commit (right-click commit also supported).
- Mode `Track` + `Esc`: cancel current in-progress track draft.
- Mode `Station`: left-click near a route to place a station.
- Mode `Select`: left-click single-select (by current Selection Targets).
- Mode `Select` + `Ctrl` (or `Cmd`) + left-click: toggle-select individual entities (non-contiguous selection).
- Mode `Select`: left-drag pans map.
- Mode `Select` + `Shift` drag: range-select and add to current selection.
- Mode `Part`: choose rail component in `Track Parts`, click once to set anchor, then click to place connected parts.
- Mode `Part` + `Esc`: reset current part anchor.
- Selection Targets menu (in Select mode): choose what range selection picks (`Station`, `Signal`, `Object`, `Train`).
- Current implementation: `Station` and `Train` are active; `Signal` and `Object` are reserved for upcoming entities.
- Mode `Train`: create a train with station stops and times.
- Play/Pause: start or stop simulation.
- Sim speed: adjust time scale.
- Map zoom: mouse wheel.
- Map pan: middle-mouse drag.
- Curvature diagnostics: segments tighter than `Min Radius` are highlighted in red.
- `Min Radius` slider: adjust realism threshold for sharp-curve warnings.
- `Track Preset`: switch rail drawing style (`Ballast Mainline`, `Slab Urban`, `Yard Light`).
- Track rendering now uses ballast + dual rails + sleepers for a more realistic appearance.
- CAD-like dynamic grid is rendered on the map and follows zoom/pan.
- Undo/Redo: buttons in the top bar, or `Ctrl+Z` / `Ctrl+Y`.
- Save: `Ctrl+S` (saved to browser local storage in the app).
- Delete selected: in `Select` mode, press `Delete` or click `Delete Selected`.

## Notes

This is the first foundation with separation in mind:

- Track model
- Train movement model
- Future signaling/safety modules

So block, signal, interlocking, and ATS/ATC-like logic can be layered later.
