# Rolling Boulder Door Breakage

## Scope

Cover the C `launch_obj()` branch where a rolling boulder moves through a closed or locked door square, breaks the door, and keeps rolling.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3274` through `:3364` extracts one launched boulder and starts the `ROLL` movement loop.
- `nethack-c/upstream/src/trap.c:3533` through `:3541` checks `closed_door(x, y)` after the boulder enters a square. A closed or locked door prints `The boulder crashes through a door.` when visible, changes the door mask to `D_BROKEN`, recalculates blocking when the boulder still has distance to travel, and continues rolling.
- `nethack-c/upstream/src/monmove.c:2181` through `:2184` defines `closed_door()` as a door with `D_LOCKED` or `D_CLOSED`.

## JS Change

- `js/allmain.js` now breaks closed or locked doors encountered during monster-triggered rolling boulder motion.
- Visible door breakage queues `The boulder crashes through a door.` after the visible trigger prelude when the triggerer already forced a More prompt.
- Blind or otherwise non-visible door breakage stays silent while still changing the door to `D_BROKEN`.
- The boulder keeps rolling after breaking the door, matching C.

## Tests

- `rolling boulder crashes through visible locked door on path`
- `blind hero hears rolling boulder break locked door silently on path`

The tests use local trap, boulder, door, monster, visibility/status, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `launch_obj()` parity remains broader trap/terrain work: hero collision along the rolling path, path trap effects, iron-bar handling, boulder chaining, launch-drop preservation, and floor-effect integration. Rock-thrower snatch feedback is covered in audit 586.
