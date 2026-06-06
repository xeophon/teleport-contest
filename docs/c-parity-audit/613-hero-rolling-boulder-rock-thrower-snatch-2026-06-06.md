# Hero Rolling Boulder Rock Thrower Snatch

Date: 2026-06-06

## Scope

Cover the C `launch_obj()` rock-thrower boulder snatch branch for hero-triggered rolling-boulder traps.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts. It is intentionally narrower than full monster-hit parity.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` dispatches hero-triggered rolling-boulder traps through `launch_obj(BOULDER, launch, launch2, ROLL)`.
- `nethack-c/upstream/src/trap.c:3259` starts `launch_obj()`.
- `nethack-c/upstream/src/trap.c:3395` through `:3407` checks `m_at(x, y)`, lets `throws_rocks()` monsters snatch boulders on nonzero `rn2(3)`, clears `otrapped`, hands the object to `mpickobj()`, marks the launch used up, clears the launch-drop rescue spot, and stops before `ohitmon()`.
- `nethack-c/upstream/src/trap.c:3423` starts the later rolling-boulder down-gate and trap block, so snatching precedes stairs, landmines, teleport traps, floor effects, and boulder chaining.
- `nethack-c/upstream/src/steal.c:616` through `:660` defines `mpickobj()` side effects including shop-bill removal, `no_charge` clearing, and monster-inventory handoff.
- `nethack-c/upstream/src/mkobj.c:2642` through `:2674` defines `add_to_minv()` insertion and merge behavior.
- `nethack-c/upstream/src/mthrowu.c:321` through `:494` remains the source for the generic `ohitmon()` path after failed snatches and non-rock-thrower monster collisions.

## JS Coverage

- `js/cmd.js` now checks for a live monster on each hero-triggered rolling-boulder path square before down-gates, traps, floor effects, boulder chaining, doors, bars, and wall/tree stops.
- A boulder on a rock-thrower square consumes `rn2(3)` and is snatched on nonzero, matching the C two-in-three gate.
- Visible snatches append `The stone giant snatches the boulder.` using the existing monster display-name helper and the same sight gate as the existing monster-triggered branch.
- Snatched boulders clear `otrapped`, `hidden`, `transientProjectile`, and `no_charge`, are removed from the level object list, have any live shop bill removed, and are handed to the monster with `add_to_minv()`.
- The path result marks the boulder consumed and stops at the snatch square so `placeHeroRollingBoulderAtRest()` cannot resurrect it at the endpoint.

## Tests

- `hero rolling boulder rock thrower snatches before same-square stairs and land mine`
- `blind hero rolling boulder rock thrower snatch is silent`

## Remaining Edges

- Failed rock-thrower snatches still fall through to no command-side monster hit. Upstream immediately calls `ohitmon(mtmp, singleobj, -1, FALSE)`.
- Non-rock-thrower monster collisions on hero-triggered rolling-boulder paths still lack generic `ohitmon()` hit/miss, damage, kill, passive, anger, visibility, and drop/floor-effect routing.
- The launch-drop bones rescue slot is still represented only by local launch cleanup and placement tests, not by a full command-side death/bones interruption canary for hero-triggered rolling-boulder motion.
