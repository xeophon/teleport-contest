# Rolling Boulder Path Down Gates

## Scope

Cover the C `launch_obj()` branch where a monster-triggered rolling boulder reaches a down-gate square before path trap effects.

This slice does not use replay maps, hidden tests, fixed seeds, player names, move counts, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3423` calls `down_gate()` and `ship_object(singleobj, x, y, FALSE)` for rolling objects before the path trap switch.
- `nethack-c/upstream/src/dokick.c:1943` through `:1968` detects down stairs, down ladders, branch/special stairs, and seen holes/trap doors, with stairs/ladders taking precedence over same-square seen holes.
- `nethack-c/upstream/src/dokick.c:1657` makes ladders always drop, while non-ladder gates use the `rn2(3)` no-drop roll.
- `nethack-c/upstream/src/dokick.c:1909` through `:1938` emits visible transit wording before any impact-drop handling.
- `nethack-c/upstream/src/dokick.c:1743` through `:1752` queues shipped objects for migration and clears `otrapped` for rolling-boulder-trap boulders.

## JS Change

- `js/cmd.js` now exports the existing `downGateAt()`, `impactDropFloorObjects()`, and `queueImpactDroppedObjects()` helpers so rolling boulders can share the same down-gate metadata and migration queue as projectile/drop paths.
- `js/allmain.js` now checks down gates after rolling-boulder landmines and before teleport, pit/hole, boulder-chain, door, bars, and wall handling.
- Down ladders always migrate the boulder off-level and clear `otrapped`.
- Down stairs and branch/special stairs use the C-shaped `rn2(3)` no-drop roll; no-drop results keep the boulder rolling, while drop results queue reciprocal migration metadata.
- Same-square seen holes/trap doors remain on the existing boulder-plug path for this slice; the C boulder exception can still knock floor piles through the gate and remains separate from stair/ladder shipping.

## Tests

- `rolling boulder down ladder always migrates off level`
- `rolling boulder down stairs no-drop roll keeps rolling`
- `rolling boulder down stairs ships before same-square seen hole`

The tests use local stair, visibility, boulder, migration, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Generic rolling-path `flooreffects(singleobj, x, y, "fall")` after the trap switch remains open and should cover water/lava before boulder chaining, doors, bars, and final placement.
- Seen hole/trapdoor boulder `ship_object()` impact-drop side effects before plugging remain separate from the stair/ladder down-gate path.
- Broader `launch_obj()` parity still includes launch-drop preservation, hero-triggered rolling-boulder rewriting, occupation/multi interruption, and mounted-steed diversion.
