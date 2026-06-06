# Rolling Boulder Mounted-Steed Nondiversion

Date: 2026-06-06

## Scope

Match C `launch_obj()` when a rolling boulder crosses a mounted hero's square. A ridden steed is not a separate `m_at()` target for this path, so the boulder uses the normal hero collision branch instead of diverting to the steed.

This slice does not use replay maps, hidden tests, fixed seeds, player names, move-count branches, or fixture-specific runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3395` through `:3409` checks `m_at(x, y)` before `u_at(x, y)` while a launched object moves square-by-square.
- `nethack-c/upstream/src/trap.c:3414` through `:3421` handles `u_at(x, y)` by computing boulder damage, cancelling active multi, calling `thitu(9 + singleobj->spe, Maybe_Half_Phys(dam), &singleobj, NULL)`, and stopping occupations only on a hit.
- `nethack-c/upstream/include/you.h:562` defines `u_at(x, y)` as the hero coordinate check.
- `nethack-c/upstream/src/steed.c:913` through `:920` rejects placing `u.usteed` on the monster map except during dismount, so a ridden steed does not intercept `launch_obj()` through `m_at()`.
- `nethack-c/upstream/src/trap.c:1211` through `:1213` and `:1276` through `:1278` show the contrast: arrow and dart traps explicitly call `u.usteed && !rn2(2) && steedintrap(...)`; rolling boulder `launch_obj()` has no equivalent steed gate.

## JS Coverage

- `js/allmain.js` now looks up rolling-boulder path monsters through `rollingBoulderPathMonsterAt()`, which excludes `game.u.usteed`.
- This preserves ordinary monster hits, rock-thrower snatches, and boulder path ordering, while allowing the existing `rollingBoulderHitHeroAt()` branch to run for mounted heroes.
- The change also avoids adding any arrow/dart-style `rn2(2)` steed diversion roll to rolling boulders.

## Tests

- `mounted rolling boulder path hits hero instead of steed`

## Remaining Edges

- Hero-triggered rolling boulder still uses the simplified command-side launcher and does not yet share the full monster `launch_obj()` path.
- Shop/timer-specific final `place_object()` side effects remain a separate rolling-boulder slice.
