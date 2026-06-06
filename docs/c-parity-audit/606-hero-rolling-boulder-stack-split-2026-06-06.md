# Hero Rolling Boulder Stack Split

Date: 2026-06-06

## Scope

Cover C `launch_obj()` stack splitting for hero-triggered rolling-boulder traps: when the launch object is a stack, only one boulder is launched and the remaining stack stays at the launch square.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` through `:2672` routes hero-triggered rolling-boulder traps into `launch_obj(BOULDER, launch, launch2, style)`.
- `nethack-c/upstream/src/trap.c:3274` through `:3289` looks for the launch object at either endpoint and swaps endpoints when the boulder is found on the opposite side.
- `nethack-c/upstream/src/invent.c:1466` through `:1474` backs that lookup with `sobj_at()`, which scans floor objects and does not find buried objects.
- `nethack-c/upstream/src/trap.c:3291` through `:3295` extracts singleton launch objects directly.
- `nethack-c/upstream/src/trap.c:3296` through `:3299` uses `splitobj(otmp, 1L)` for stacks, then extracts the one-object split for launch while the source stack remains behind.
- `nethack-c/upstream/src/trap.c:3300` redraws the launch square after extraction.
- `nethack-c/upstream/src/trap.c:3566` through `:3571` clears the launched object's `otrapped`, places the surviving object at the final coordinates, and redraws the landing square.
- `nethack-c/upstream/src/mkobj.c:466` through `:501` gives split children fresh identity and clears copied bookkeeping such as worn, timed, lamplit, Lua reference, and pickup-prev state.

## JS Coverage

- `js/cmd.js` now splits a one-quantity launched boulder from a stacked hero-triggered launch object.
- The launched split receives a fresh object id and does not inherit `o_id`, `_shopBillObjectId`, inventory letter, inventory line, timed, lit, pickup-prev, Lua reference, or worn-mask metadata.
- The source stack is decremented in place and remains at the launch square.
- Hero-triggered launch lookup now ignores buried boulders.
- The launched split still flows through the hero final-rest cleanup from audit 604 and off-path no-hit handling from audit 605.

## Tests

- `hero rolling boulder launch splits one boulder from stacked launch object`
- `hero rolling boulder trap ignores buried launch boulder`

## Remaining Edges

- Hero-triggered launches still do not run the full square-by-square path for monsters, traps, terrain, boulder chaining, bars, walls, trees, and bones launch-drop state.
- Shop-billed stacked launch-object splitting remains broader ownership parity. Rolling-boulder trap boulders are not normally shop-billed merchandise.
- Known hero-triggered monster-hit blame through the in-flight `otrapped` marker remains open until monster hits are shared with the richer launch path.
