# Hero Rolling Boulder Path Teleport Effects

Date: 2026-06-06

## Scope

Cover the C `launch_obj()` `TELEP_TRAP` and `LEVEL_TELEP` branch for hero-triggered rolling-boulder traps. A released hero-triggered boulder now checks active path teleport traps after down gates and landmines, and before boulder chaining, pit/hole/liquid floor effects, doors, bars, and wall/tree stops.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` through `:2673` dispatches hero-triggered rolling-boulder traps through `launch_obj(BOULDER, launch, launch2, style)`.
- `nethack-c/upstream/src/trap.c:3392` through `:3459` advances each path square, resolves monster/hero collision, down-gate shipping, and landmine handling before teleport traps.
- `nethack-c/upstream/src/trap.c:3460` through `:3488` handles `LEVEL_TELEP` and `TELEP_TRAP` for rolling boulders.
- `nethack-c/upstream/src/trap.c:3506` through `:3518` only reaches later floor effects and boulder chaining if teleport did not consume the rolling object.
- `nethack-c/upstream/src/teleport.c:2102` through `:2186` covers `rloco()`: extract the object, roll `rn1(COLNO - 3, 2)` and `rn2(ROWNO)` destination candidates, apply `flooreffects(..., "fall")`, and place the object if it survives.
- `nethack-c/upstream/src/teleport.c:2191` through `:2240` covers the `random_teleport_level()` current-level gate and destination depth selection.

## JS Coverage

- `js/cmd.js` now applies command-side hero rolling-boulder teleport handling immediately after path landmines and before boulder chaining.
- Ordinary `TELEP_TRAP` relocates the moving boulder with a C-shaped object teleport helper, including the `rn1(COLNO - 3, 2)` and `rn2(ROWNO)` destination rolls, boulder/hero-square rejection, destination floor effects, trap discovery, and no final endpoint placement.
- `LEVEL_TELEP` calls the existing C-shaped `randomTeleportDepth()` helper first. A same-depth roll leaves the boulder rolling without message or trap discovery.
- Active `LEVEL_TELEP` emits the visible disappearance message, removes the boulder from the current level, queues it for random-arrival migration, and records `MIGR_RANDOM` on the object.
- The active teleport branch preempts same-square boulder chaining, matching C's `used_up` break before later floor effects and chaining.

## Tests

- `hero rolling boulder relocates on visible path teleport trap`
- `deaf blind hero rolling boulder path teleport trap relocates silently`
- `hero rolling boulder level teleporter same-level roll keeps rolling`
- `hero rolling boulder level teleporter migrates before same-square boulder chain`

## Remaining Edges

- Hero-triggered launches still do not share the full monster `launch_obj()` path for pit/hole/liquid floor effects, rock-thrower snatching, monster hits, launch-drop bones preservation, or true `thitu()` hit/damage routing.
- Destination `rloco()` floor effects use the existing JS `earthFloorEffects()` coverage; broader command-side launch-drop cleanup and used-up billing for teleported-then-destroyed boulders should remain separate if new C canaries require it.
- The command-side helper still has no generic C `wake_nearto()` model for rolling-boulder impacts.
