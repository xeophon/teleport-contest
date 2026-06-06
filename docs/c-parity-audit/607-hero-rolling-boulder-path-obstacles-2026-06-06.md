# Hero Rolling Boulder Path Obstacles

Date: 2026-06-06

## Scope

Cover the first terrain-obstacle slice of C `launch_obj()` path walking for hero-triggered rolling-boulder traps. A released hero-triggered boulder now walks its path for closed doors, iron bars, wall/tree stops, and out-of-bounds guards instead of always jumping to the nominal endpoint.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3274` through `:3291` finds the launch boulder at either endpoint and swaps endpoints when the boulder is on the opposite side.
- `nethack-c/upstream/src/trap.c:3293` through `:3302` extracts a singleton launch object or a one-object split before path motion begins.
- `nethack-c/upstream/src/trap.c:3313` through `:3317` computes distance and direction from the launch endpoint to the target endpoint.
- `nethack-c/upstream/src/trap.c:3363` through `:3393` walks the path one square at a time and stops on the current square if the next step would go out of bounds.
- `nethack-c/upstream/src/trap.c:3533` through `:3540` breaks closed or locked doors on the current path square and keeps rolling.
- `nethack-c/upstream/src/trap.c:3543` through `:3556` looks ahead for iron bars, stops the object on the near side, and calls `hits_bars()` with a `rn2(20)` force-hit roll.
- `nethack-c/upstream/src/trap.c:3557` through `:3563` looks ahead for walls or trees, stops the object on the near side, and reports `Thump!` when the hero is not deaf.
- `nethack-c/upstream/src/trap.c:3568` through `:3571` clears `otrapped`, places the surviving object at the selected final square, and redraws it.

## JS Coverage

- `js/cmd.js` now computes a focused hero-triggered rolling-boulder path result before final rest placement.
- Closed or locked doors on the path are changed to broken doors and visible crashes are appended to the trigger message.
- Iron bars stop the boulder on the near side, spend the same `rn2(20)` plus survival-check `rn2(100)` calls already modeled by the monster rolling-boulder path, and report `Whang!` unless the hero is deaf.
- Walls, stone, and trees stop the boulder on the near side and suppress the old fake hero miss/RNG for a hero beyond the obstacle.
- Out-of-bounds guard behavior now selects the current valid square as the final rest location.

## Tests

- `hero rolling boulder crashes through path door and keeps rolling`
- `hero rolling boulder whangs iron bars and stops on near side`
- `sitting hero rolling boulder wall stop does not hit hero beyond obstacle`

## Remaining Edges

- Hero-triggered launches still do not share the full monster `launch_obj()` path for monsters, rock-thrower snatching, boulder chaining, down gates, land mines, teleport traps, pit/hole/liquid floor effects, launch-drop bones preservation, or true `thitu()` hit/damage routing.
- The command-side hero branch still has its own focused path helper because the richer monster helper is local to `js/allmain.js`; importing it directly into `js/cmd.js` would introduce a module cycle.
- Shop/timer-specific generic `place_object()` side effects beyond the covered `no_charge` cleanup remain shared-placement work.
