# Hero Rolling Boulder Path Landmine

Date: 2026-06-06

## Scope

Cover the C `launch_obj()` landmine branch for hero-triggered rolling-boulder traps. A released hero-triggered boulder now checks for a land mine on each path square before boulder chaining, door breakage, and next-square obstacle lookahead.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` dispatches hero-triggered rolling-boulder traps through `launch_obj(BOULDER, launch, launch2, style)`.
- `nethack-c/upstream/src/trap.c:3392` through `:3423` handles monster/hero collision before rolling path trap handling.
- `nethack-c/upstream/src/trap.c:3424` through `:3430` checks down gates before same-square path traps.
- `nethack-c/upstream/src/trap.c:3431` through `:3457` handles boulder-only path traps after down gates and before teleport, pit/hole, generic floor effects, boulder chaining, doors, bars, and wall/tree lookahead.
- `nethack-c/upstream/src/trap.c:3437` through `:3457` applies the landmine branch: `rn2(10) > 2` detonates, while low rolls leave the mine intact and the boulder rolling.
- On detonation, C prints `KAABLAMM!!!` plus `  The rolling boulder triggers a land mine.` when the square is visible, deletes the trap and same-square engraving, places and fractures the moving boulder, scatters fallout, marks it used up, clears the launch-drop spot, and skips final boulder placement.

## JS Coverage

- `js/cmd.js` now checks for a `LANDMINE` in the focused hero-triggered rolling-boulder path helper before the existing boulder-chain and terrain-obstacle branches.
- The helper consumes the C-shaped `rn2(10)` gate. Rolls `0`, `1`, or `2` leave the landmine intact and continue the existing rolling path.
- Detonation appends the C-visible message, removes the landmine trap, deletes same-square engravings, removes the moving boulder from the level object list, and suppresses final boulder placement.
- This path does not route through ordinary hero landmine handling: it does not damage/wound the hero, spend hero landmine RNG, or convert the mine into a pit.
- The singleton and split-stack launch cases share the same removal path: singleton moving boulders are filtered from `game.level.objects`, while split launched boulders were not inserted into the level list yet.

## Tests

- `hero rolling boulder detonates path land mine and is consumed`
- `deaf blind hero rolling boulder path land mine still reports kaablamm only`
- `hero rolling boulder path land mine dud keeps rolling`

## Remaining Edges

- Hero-triggered launches still do not share the full monster `launch_obj()` path for down gates, teleport traps, pit/hole/liquid floor effects, rock-thrower snatching, monster hits, launch-drop bones preservation, or true `thitu()` hit/damage routing.
- Full landmine explosion parity still needs the C `fracture_rock()` and `scatter()` fallout, including drawbridge/liquid/pit conversion fallout, object destruction, wake effects, and shop/object side effects.
- The command-side helper still has no generic C `wake_nearto()` model for rolling-boulder impacts.
