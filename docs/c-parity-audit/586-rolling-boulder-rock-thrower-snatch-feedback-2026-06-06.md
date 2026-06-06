# Rolling Boulder Rock Thrower Snatch Feedback

## Scope

Cover the C `launch_obj()` branch where a rolling boulder reaches a rock-throwing monster and that monster snatches it before ordinary hit resolution.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3395` through `:3405` checks for a monster on the rolling boulder's current square before normal `ohitmon()` handling. If the object is a boulder, the monster throws rocks, and `rn2(3)` is nonzero, the monster snatches the boulder.
- `nethack-c/upstream/src/trap.c:3398` through `:3400` prints `<Mon> snatches the boulder.` only when the hero can see the snatch square.
- `nethack-c/upstream/src/trap.c:3401` through `:3404` clears the launched trap flag, moves the boulder into monster inventory with `mpickobj()`, marks the object used up, and clears the launch-drop spot. The successful snatch stops before `ohitmon()`, so no hit or damage rolls are consumed.
- `nethack-c/upstream/include/mondata.h:134` defines `throws_rocks(ptr)` through `M2_ROCKTHROW`.

## JS Change

- `js/allmain.js` now reports visible rock-thrower snatches during monster-triggered rolling boulder motion.
- The message uses the same rolling-boulder motion queue as door breakage so visible trigger preludes stay before the `--More--` continuation.
- Blind or otherwise non-visible snatches remain silent while still moving the boulder into the monster inventory.
- Successful snatches still stop before hit and damage rolls.

## Tests

- `visible rock thrower snatches rolling boulder before hit roll`
- `blind hero gets no rock thrower snatch message from rolling boulder`

The tests use local trap, boulder, rock-throwing monster, visibility/status, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `launch_obj()` parity remains broader trap/terrain work: path trap effects, launch-drop preservation, and floor-effect integration. Iron-bars handling is covered in audit 587, boulder chaining is covered in audit 588, and hero collision along the rolling path is covered in audit 589.
