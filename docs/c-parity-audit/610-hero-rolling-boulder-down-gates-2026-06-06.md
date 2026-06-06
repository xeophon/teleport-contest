# Hero Rolling Boulder Down Gates

Date: 2026-06-06

## Scope

Cover the C `launch_obj()` down-gate branch for hero-triggered rolling-boulder traps. A released hero-triggered boulder now checks down stairs, down ladders, and seen down-shaft gates before same-square landmines and later path trap/floor effects.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` through `:2673` dispatches hero-triggered rolling-boulder traps through `launch_obj(BOULDER, launch, launch2, style)`.
- `nethack-c/upstream/src/trap.c:3392` through `:3422` advances the rolling boulder and resolves monster/hero collision before path trap handling.
- `nethack-c/upstream/src/trap.c:3423` through `:3430` checks `down_gate(x, y)` first for rolling objects. If `ship_object(singleobj, x, y, FALSE)` succeeds, the boulder is used up, the launch-drop spot is cleared, and same-square trap handling is skipped.
- `nethack-c/upstream/src/trap.c:3431` through `:3438` only reaches landmine handling after the down-gate branch declined to ship the boulder.
- `nethack-c/upstream/src/dokick.c:1657` through `:1660` makes ladders always ship ordinary objects while non-ladder down gates spend the `rn2(3)` no-drop roll.
- `nethack-c/upstream/src/dokick.c:1675` through `:1681` gives boulders the seen-hole/trapdoor exception: impact-drop other objects first, then return for the caller to plug the shaft.
- `nethack-c/upstream/src/dokick.c:1684` through `:1692` emits visible transit text and returns without shipping when the no-drop branch wins.
- `nethack-c/upstream/src/dokick.c:1743` through `:1750` migrates shipped objects and clears `otrapped` for boulders from rolling-boulder traps.

## JS Coverage

- `js/cmd.js` now applies a command-side hero rolling-boulder down-gate helper before the existing landmine, boulder-chain, door, bars, and wall/tree path branches.
- The helper uses the shared `downGateAt()`, impact-drop pile counting, `impactDropFloorObjects()`, and `queueImpactDroppedObjects()` machinery already used by projectile and monster rolling-boulder paths.
- Down ladders always migrate the moving boulder off level without spending the stair no-drop `rn2(3)` roll.
- Down stairs spend the C-shaped `rn2(3)` no-drop gate: a nonzero roll leaves the boulder rolling, while a zero roll queues the boulder for migration and removes it from the current level.
- A successful down-stairs ship preempts same-square landmine handling, so the mine remains intact and no `rn2(10)` landmine roll is consumed.

## Tests

- `hero rolling boulder down ladder migrates off level`
- `hero rolling boulder down stairs no-drop roll keeps rolling`
- `hero rolling boulder down stairs ships before same-square land mine`

## Remaining Edges

- Hero-triggered launches still do not share the full monster `launch_obj()` path for teleport traps, pit/hole/liquid floor effects, rock-thrower snatching, monster hits, launch-drop bones preservation, or true `thitu()` hit/damage routing.
- Seen hole/trapdoor down gates currently use the shared boulder special case and remain covered on the richer monster path; broader command-side shaft impact/drop plus plug ordering should be a separate source-backed slice.
- The command-side helper still has no generic C `wake_nearto()` model for rolling-boulder impacts.
