# Rolling Boulder Path Landmine

## Scope

Cover the C `launch_obj()` branch where a monster-triggered rolling boulder crosses a land mine on its path.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3431` through `:3457` handles boulder-only path traps after monster/hero collision and before generic `flooreffects()`, boulder chaining, door breakage, and bars/wall/tree lookahead.
- `nethack-c/upstream/src/trap.c:3437` through `:3457` applies the landmine branch: `rn2(10) > 2` detonates, while low rolls leave the boulder rolling with no further landmine effects.
- On detonation, C prints `KAABLAMM!!!` and adds `  The rolling boulder triggers a land mine.` only when the mine square is visible.
- The C detonation branch deletes the trap and engraving, places the rolling boulder at the mine square, fractures/scatters it, marks the boulder used up, clears the launch-drop spot, and returns `2` from `launch_obj()` via the used-up path at `nethack-c/upstream/src/trap.c:3573`.

## JS Change

- `js/allmain.js` now checks for a `LANDMINE` on each rolling-boulder path square after hero collision and before chaining, door breakage, and lookahead terrain.
- The helper consumes the C `rn2(10)` gate. Rolls `0`, `1`, or `2` leave the mine intact and the boulder continues to its normal destination.
- Detonation emits the C visible/invisible message, removes the landmine trap, deletes same-square engravings, consumes the rolling boulder, and stops the launch without final boulder placement.

## Tests

- `rolling boulder detonates path land mine and is consumed`
- `rolling boulder path land mine dud keeps rolling`

The tests use local trap, boulder, visibility, engraving, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full landmine parity still needs the C `fracture_rock()`/`scatter()` object fallout, wake effects, drawbridge/liquid/pit conversion fallout, and shop/object side effects from the broader explosion/scatter pipeline.
- Full `launch_obj()` parity remains broader trap/terrain work: teleport and level-teleport path traps, launch-drop preservation, final-placement floor effects, hero-triggered rolling-boulder rewriting, occupation/multi interruption, and mounted-steed diversion. Pit/spiked-pit/hole/trapdoor path effects are covered in audit 591.
