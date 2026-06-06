# Rolling Boulder Launch Drop Bones

Date: 2026-06-06

## Scope

Cover the C `launch_obj()` rescue slot used to preserve a launched rolling boulder if death/bones generation interrupts the launch.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3221` through `:3231` stores or clears the global `gl.launchplace` rescue slot.
- `nethack-c/upstream/src/trap.c:3235` through `:3240` reports launch-in-progress state from that slot.
- `nethack-c/upstream/src/trap.c:3244` through `:3249` force-places the saved launch object at the saved square with `otrapped` cleared.
- `nethack-c/upstream/src/trap.c:3353` through `:3361` records the launch start square immediately after extracting the object, intentionally before knowing the eventual resting square.
- `nethack-c/upstream/src/trap.c:3404`, `:3411`, `:3427`, `:3457`, `:3487`, `:3498`, `:3511`, `:3553`, and `:3567` clear the rescue slot after used-up or normal launch completion paths.
- `nethack-c/upstream/src/end.c:1203` through `:1204` calls `force_launch_placement()` before bones creation when death occurs while a launch is in progress.

## JS Coverage

- `js/allmain.js` now records `game._launch_drop_spot` when a monster-triggered rolling boulder is extracted from the floor.
- Normal final placement and modeled used-up/migrated rolling-boulder branches clear the launch-drop slot.
- Lethal hero impact during a rolling-boulder launch leaves the extracted boulder in the launch-drop slot instead of simulating the rest of the path.
- `js/save.js` now force-places an active launch-drop object before cloning the level for bones, clears `otrapped`, and skips the transient slot in save serialization.

## Tests

- `lethal rolling boulder launch is forced back to start for bones`
- `bones encoding force-places object from active launch drop spot`

## Remaining Edges

- Hero-triggered rolling boulder still uses the simplified command-side launcher and does not yet share this full launch-drop model.
- Rolling-boulder used-up shop-billing cleanup for floor effects remains a separate source-backed slice.
