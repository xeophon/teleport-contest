# Hero Rolling Boulder Off-Path Release

Date: 2026-06-06

## Scope

Cover the C `launch_obj()` rule that a hero-triggered rolling boulder only performs hero hit/miss handling when the launched path actually reaches the hero.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` through `:2672` routes hero-triggered rolling-boulder traps into `launch_obj(BOULDER, launch, launch2, style)`.
- `nethack-c/upstream/src/trap.c:3274` through `:3289` finds a boulder at either endpoint and swaps the launch endpoints when needed.
- `nethack-c/upstream/src/trap.c:3384` through `:3392` advances the launched object one square at a time along the launch vector.
- `nethack-c/upstream/src/trap.c:3414` through `:3420` runs hero damage, `thitu()`, and occupation stop only in the `u_at(x, y)` branch for the current path square.
- `nethack-c/upstream/src/trap.c:3566` through `:3571` places surviving launched objects at the final endpoint without adding a fake hero miss message.

## JS Coverage

- `js/cmd.js` now computes whether the simplified hero-triggered endpoint launch crosses the hero's current square.
- Released boulders that do not cross the hero still move to the endpoint but no longer append `A boulder misses you.`
- Off-path releases no longer spend the simplified hero hit RNG pair.
- Existing on-path hero-triggered releases still retain the current simplified miss text and two `rnd(20)` calls until the full `launch_obj()` hit path is ported.

## Tests

- `hero rolling boulder release off hero path does not fake miss or spend hit RNG`

## Remaining Edges

- Hero-triggered launches still do not split stacked boulders before launch.
- Hero-triggered launches still do not run the full square-by-square path for monsters, traps, terrain, boulder chaining, bars, walls, trees, and bones launch-drop state.
- Known hero-triggered monster-hit blame through the in-flight `otrapped` marker remains open until monster hits are shared with the richer launch path.
