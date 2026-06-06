# Rolling Boulder Hero Collision

## Scope

Cover the C `launch_obj()` branch where a monster-triggered rolling boulder crosses the hero's square.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3395` through `:3421` resolves monster collision first, then hero collision only if no monster occupies the rolling square.
- `nethack-c/upstream/src/trap.c:3414` through `:3421` computes `dmgval(singleobj, &gy.youmonst)` before `thitu(9 + singleobj->spe, Maybe_Half_Phys(dam), &singleobj, NULL)`, so boulder damage RNG precedes the hit-roll RNG.
- `nethack-c/upstream/src/weapon.c:263` through `:265` and `nethack-c/upstream/include/objects.h:1617` through `:1619` make ordinary boulder damage `rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:106` through `:121` defines `thitu()` hit/miss threshold and messages, while `nethack-c/upstream/src/mthrowu.c:126` through `:151` handles rock-passing harmless hits, HP loss, and strength exercise.
- `nethack-c/upstream/include/hack.h:1236` through `:1237` applies half physical damage by rounding up.
- `nethack-c/upstream/src/trap.c:3423` through `:3543` continues into path traps, floor effects, boulder chaining, door breakage, and lookahead terrain after hero collision; hitting or missing the hero does not stop the boulder.

## JS Change

- `js/allmain.js` now checks the hero's square after monster collision and before boulder chaining, door breakage, and bars/wall/tree lookahead.
- The helper consumes boulder damage `rnd(20)` before the `rnd(20)` hit roll, applies half physical damage rounding, emits the C `thitu()` hit/miss text, queues deferred HP loss/strength exercise on damaging hits, and leaves the boulder rolling.
- Rock-passing polyself forms get the C hit line plus harmless follow-up without HP loss or strength exercise.

## Tests

- `rolling boulder hits half-physical hero on path and keeps rolling`
- `rolling boulder miss against hero consumes damage before hit roll`
- `rolling boulder hit against rock-passing polyself is harmless`

The tests use local trap, boulder, hero position/status/form, visibility, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `launch_obj()` parity remains broader trap/terrain work: teleport path effects, launch-drop preservation, floor-effect integration, hero-triggered rolling-boulder rewriting, occupation/multi interruption, and mounted-steed diversion. Path landmines are covered in audit 590, and pit/hole path effects are covered in audit 591.
