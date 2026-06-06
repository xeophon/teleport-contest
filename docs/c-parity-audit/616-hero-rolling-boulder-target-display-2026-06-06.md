# Hero Rolling Boulder Target Display

Date: 2026-06-06

## Scope

Cover the target-name branch of `ohitmon()` for hero-triggered rolling-boulder hits and misses when the target is an apparent-monster mimic, a hidden monster, an unspotted invisible monster, or a visible monster while `flags.verbose` is false.

This slice is state-driven and does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3395` through `:3408` handles rolling-boulder monster collisions and calls `ohitmon(mtmp, singleobj, -1, FALSE)`.
- `nethack-c/upstream/src/mthrowu.c:335` excludes `M_AP_MONSTER` from the object/furniture mimic reveal branch.
- `nethack-c/upstream/src/mthrowu.c:336` gates messages on visible square state with `cansee(gb.bhitpos.x, gb.bhitpos.y)`.
- `nethack-c/upstream/src/mthrowu.c:350` through `:356` emits miss text only for non-object/furniture mimics.
- `nethack-c/upstream/src/mthrowu.c:373` through `:382` rolls damage, then clears `msleeping` on hit without clearing `mundetected` or `M_AP_MONSTER`.
- `nethack-c/upstream/src/mthrowu.c:390` through `:397` delegates hit text to `hit(...)`.
- `nethack-c/upstream/src/zap.c:3555` through `:3568` uses `mon_nam(mtmp)` only when the target should be described verbosely; otherwise it says `it`.
- `nethack-c/upstream/src/zap.c:3570` through `:3576` applies the same verbose target-name rule for miss text.
- `nethack-c/upstream/src/do_name.c:840` through `:912` makes `M_AP_MONSTER` use `mappearance` as the displayed monster.
- `nethack-c/upstream/src/do_name.c:861` through `:884` makes `mon_nam()` return `it` when the monster cannot be spotted.

## JS Coverage

- `heroRollingBoulderMonsterTargetName()` now mirrors the relevant `hit()`/`miss()` naming boundary:
  - `flags.verbose === false` uses `it`.
  - unspotted hidden or invisible targets use `it`.
  - `M_AP_MONSTER` targets can use apparent monster metadata instead of the real monster name.
  - spotted invisible targets preserve the `invisible` adjective when named.
- `M_AP_MONSTER` rolling-boulder hits and misses remain unrevealed, matching the C branch that excludes them from `seemimic()`.
- Hidden and invisible target hits still clear `msleeping` and damage the target, but do not clear `mundetected` or `minvis`.
- Misses consume only the hit-roll RNG and leave sleep/hidden/appearance state untouched.

## Tests

- `hero rolling boulder names apparent-monster mimic on hit`
- `hero rolling boulder names apparent-monster mimic on miss`
- `hero rolling boulder hit hidden target says it and stays hidden`
- `hero rolling boulder miss hidden target says it and stays asleep`
- `hero rolling boulder hit invisible unspotted target says it`
- `hero rolling boulder nonverbose hit visible target says it`

## Remaining Edges

- Full `canspotmon()` parity via telepathy, warning, and monster detection remains separate; this slice covers the existing physical-visibility model.
- Numeric `mappearance` to monster-index resolution is not generalized; this slice supports local apparent-monster metadata used by the JS model.
- `observe_object()` side effects for visible boulder hits remain separate.
- Full `drop_throw()` fallout remains incomplete for shop billing, floor effects, passive-object erosion, and object-gone stopping.
- Full lethal attribution for rolling-boulder monster kills remains broader than this target-display slice.
- Potion, egg, poison, silver, acid, blindness, cream-pie, and passive combat effects remain separate `ohitmon()` slices.
