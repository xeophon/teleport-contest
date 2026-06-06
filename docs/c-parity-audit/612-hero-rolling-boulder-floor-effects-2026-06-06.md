# Hero Rolling Boulder Floor Effects

Date: 2026-06-06

## Scope

Cover the C `launch_obj()` floor-effect order for hero-triggered rolling-boulder traps after the teleport branch and before same-square boulder chaining, door breakage, iron bars, and wall/tree stops.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` through `:2673` dispatches hero-triggered rolling-boulder traps through `launch_obj(BOULDER, launch, launch2, style)`.
- `nethack-c/upstream/src/trap.c:3392` through `:3488` advances the path square and handles collision, down-gate shipping, landmines, and teleport traps before this slice.
- `nethack-c/upstream/src/trap.c:3489` through `:3501` handles `PIT`, `SPIKED_PIT`, `HOLE`, and `TRAPDOOR`: set the final square to the trap square, call `flooreffects(..., "fall")`, mark the object used up if consumed, and stop immediately even if the boulder remains.
- `nethack-c/upstream/src/trap.c:3509` through `:3513` applies generic `flooreffects(..., "fall")`; only a consumed object stops before chaining and obstacles.
- `nethack-c/upstream/src/do.c:49` through `:269` covers boulder liquid and pit/hole floor effects: trap deletion, burial, visible/audible messages, liquid `rn2(10)`, and used-up object handling.
- `nethack-c/upstream/src/dokick.c:1675` through `:1681` is the seen hole/trapdoor impact-drop-before-plugging order that remains ahead of the plug branch through `down_gate()`.

## JS Coverage

- `js/cmd.js` now mirrors the existing monster rolling-boulder floor-effect helper shape for the command-side hero path.
- Hero-triggered rolling boulders detect path `PIT`, `SPIKED_PIT`, `HOLE`, and `TRAPDOOR` after active teleport handling and before boulder chaining. That branch calls `earthFloorEffects(..., "fall", { usedUpShopBillOnDestroy: true })` and stops on the trap square regardless of the consumed flag.
- Generic floor effects now run after the pit/hole trap switch. Consuming effects such as pool and lava remove the moving boulder and preempt downstream boulders, door breakage, bars, and wall/tree checks.
- The helper temporarily sets `game._monster_moving` while applying object-caused floor effects, matching the monster path's attribution and message routing for trapped-monster and shop-billing side effects.
- Consumed hero-launched boulders are removed from `game.level.objects`, so `placeHeroRollingBoulderAtRest()` cannot resurrect them at the final endpoint.

## Tests

- `hero rolling boulder fills path pit and buries floor object`
- `hero rolling boulder fills path spiked pit before downstream boulder`
- `hero rolling boulder impact-drops seen path hole pile before plugging`
- `hero rolling boulder triggers and plugs unseen path trap door`
- `hero rolling boulder fills visible path pool before downstream boulder`
- `hero rolling boulder sinks in visible path lava before bars lookahead`

## Remaining Edges

- Hero-triggered launches still do not share the full monster `launch_obj()` path for rock-thrower snatching, monster hits, launch-drop bones preservation, or true `thitu()` hit/damage routing.
- Pit/hole cases with a trapped monster or trapped hero are still covered through shared `earthFloorEffects()` behavior but do not yet have dedicated hero-triggered rolling-boulder command canaries.
- Destination `rloco()` floor effects remain covered by audit 611 and the existing shared floor-effect tests; broader command-side launch-drop cleanup should stay separate if new source canaries require it.
