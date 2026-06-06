# Rolling Boulder Path Pit And Hole Effects

## Scope

Cover the C `launch_obj()` branch where a monster-triggered rolling boulder crosses a pit, spiked pit, hole, or trap door on its path.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3489` through `:3506` handles rolling boulders on `PIT`, `SPIKED_PIT`, `HOLE`, and `TRAPDOOR` path traps by setting the final stop square to the trap square, calling `flooreffects(singleobj, x2, y2, "fall")`, and stopping the launch immediately.
- If `flooreffects()` consumes the boulder, `launch_obj()` follows the used-up return path at `nethack-c/upstream/src/trap.c:3573`; otherwise the post-loop placement leaves the boulder on the trap square.
- `nethack-c/upstream/src/do.c:185` through `:261` covers boulder pit/hole floor effects: trapped-occupant messaging, trap deletion, boulder use-up, same-square object burial, and messages such as `The boulder fills a pit.`, `The boulder plugs a hole.`, and `The boulder triggers and plugs a trap door.`

## JS Change

- `js/allmain.js` now checks for `PIT`, `SPIKED_PIT`, `HOLE`, or `TRAPDOOR` after rolling-boulder landmines and before boulder chaining, door breakage, and lookahead terrain.
- The rolling-boulder path delegates to `earthFloorEffects(boulder, x, y, messages, 'fall')`, preserving the existing boulder burial/debt/trap-removal behavior.
- Messages are routed through the rolling-boulder motion queue so visible trigger preludes stay before the `--More--` continuation.
- The loop always stops on these traps. If the floor-effect helper consumes the boulder, no final boulder is placed; if a future edge returns unconsumed, the boulder stops on the trap square.

## Tests

- `rolling boulder plugs seen path hole and is consumed`
- `rolling boulder triggers and plugs unseen path trap door`
- `rolling boulder fills path pit and buries floor object`

The tests use local trap, boulder, visibility, buried-object, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `launch_obj()` parity remains broader trap/terrain work: teleport and level-teleport path traps, launch-drop preservation, final-placement floor effects, hero-triggered rolling-boulder rewriting, occupation/multi interruption, and mounted-steed diversion.
