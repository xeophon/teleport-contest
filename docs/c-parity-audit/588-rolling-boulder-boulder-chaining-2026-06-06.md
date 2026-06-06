# Rolling Boulder Boulder Chaining

## Scope

Cover the C `launch_obj()` branch where a rolling boulder reaches another boulder and transfers motion to it.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3509` through `:3513` applies floor effects before boulder chaining; this slice only covers chaining after surviving prior path handling.
- `nethack-c/upstream/src/trap.c:3514` through `:3530` finds another boulder at the current rolling square, chooses either `as one boulder sets another in motion` or `as one boulder hits another` based on next-square/remaining-distance obstruction, emits `You hear a loud crash...` unless deaf, extracts the stationary boulder, places the moving boulder at the collision square, and continues rolling with the stationary boulder as the new moving object.
- `nethack-c/upstream/src/trap.c:3533` through `:3556` handles door breakage and iron-bars checks after chaining.

## JS Change

- `js/allmain.js` now detects a stationary boulder at the rolling boulder's current square before door and next-square terrain checks.
- The current moving boulder is placed at the collision square, the stationary boulder is removed from the floor list and becomes the moving boulder, then normal rolling continues to the final launch square.
- Non-deaf heroes hear the C crash message; the visible collision square gets the C suffix, while deaf heroes get no crash text.
- The branch consumes no RNG and does not mark any path trap seen.

## Tests

- `rolling boulder sets another boulder in motion`
- `rolling boulder hits another boulder at final square`
- `rolling boulder chain before iron bars reports motion then bars impact`
- `deaf hero gets no rolling boulder chain crash sound`

The tests use local trap, boulder, visibility/status, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `launch_obj()` parity remains broader trap/terrain work: path trap effects, launch-drop preservation, and floor-effect integration. Hero collision along the rolling path is covered in audit 589.
