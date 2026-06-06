# Rolling Boulder Path Liquid Floor Effects

## Scope

Cover the C `launch_obj()` branch where a monster-triggered rolling boulder reaches generic floor effects after path trap handling, with focused water and lava coverage.

This slice does not use replay maps, hidden tests, fixed seeds, player names, move counts, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3423` checks `down_gate()` before path traps.
- `nethack-c/upstream/src/trap.c:3431` through `:3508` handles rolling-path trap effects.
- `nethack-c/upstream/src/trap.c:3509` calls `flooreffects(singleobj, x, y, "fall")` before boulder chaining, door breakage, iron bars, walls, trees, and final placement.
- `nethack-c/upstream/src/do.c:185` routes boulder floor effects through liquid handling before ordinary pit/hole handling.
- `nethack-c/upstream/src/do.c:49` through `:113` covers boulder liquid outcomes: filling water or lava, burying floor objects, deleting floor traps, killing filled occupants, splash feedback, lava splash feedback, and no-trace sinking.

## JS Change

- `js/allmain.js` now calls shared `earthFloorEffects()` for a rolling boulder after down-gate, landmine, teleport, and pit/hole path handling, and before boulder chaining, door breakage, iron-bars lookahead, and final placement.
- The call temporarily marks monster-moving context so shop debt side effects follow the existing non-hero floor-effect path.
- Rolling-boulder floor-effect messages are routed through the after-more rolling-boulder message queue.
- The prior down-gate/landmine order is corrected so a boulder ships through a down gate before same-square land mines, matching the C `launch_obj()` order.

## Tests

- `rolling boulder down stairs ships before same-square land mine`
- `rolling boulder fills visible path pool and stops before downstream boulder`
- `rolling boulder sinks in visible path lava before bars lookahead`

The tests use local stair, trap, terrain, visibility, object, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Seen hole/trapdoor boulder `ship_object()` impact-drop side effects before plugging are covered in audit 595.
- Broader `launch_obj()` parity still includes launch-drop preservation, hero-triggered rolling-boulder rewriting, occupation/multi interruption, mounted-steed diversion, and final placement side effects.
- Shared boulder liquid details outside this slice still need source-backed coverage, including adjacent-lava damage modifiers and non-visual wake/noise details.
