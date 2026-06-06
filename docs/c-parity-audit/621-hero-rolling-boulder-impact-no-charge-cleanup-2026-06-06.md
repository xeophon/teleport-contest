# Hero Rolling Boulder Impact No-Charge Cleanup

Date: 2026-06-06

## Scope

Cover the `place_object()` shop-flag cleanup that occurs during the transient `drop_throw()` placement after a hero-triggered rolling boulder nonlethally hits a monster and survives.

This slice is state-driven and does not use replay maps, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/mthrowu.c:180` through `:190` runs `down_gate()`, `flooreffects()`, `place_object()`, optional `passive_obj()`, and `stackobj()` for surviving `drop_throw()` objects.
- `nethack-c/upstream/src/mthrowu.c:494` through `:497` calls `drop_throw(otmp, 1, bhitpos)` and, for surviving rolling boulders with `range == -1`, immediately extracts the placed object so it can keep moving.
- `nethack-c/upstream/src/mkobj.c:2356` through `:2359` clears `otmp->no_charge` during `place_object()` unless the placement square remains a costly spot or costly-adjacent shop square for the object owner.
- `nethack-c/upstream/src/trap.c:3408` through `:3427` then resumes the ordinary rolling path after `ohitmon()` returns `FALSE` for the surviving rolling object.
- `nethack-c/upstream/include/objects.h:1617` through `:1619` marks boulders as non-merging objects, so this slice does not change same-square boulder chaining.

## JS Coverage

- The command-side rolling-boulder final-rest no-charge predicate is now shared with the transient hit-square placement path.
- A surviving monster-hit impact now applies C `place_object()` no-charge cleanup after down-gate/floor effects and before passive object effects.
- A boulder that hits a monster on a non-shop square now loses stale `no_charge` even if it later comes to rest inside a shop square.
- The change does not create a shop bill row, matching C `place_object()` for this placement side effect.
- Same-square boulder chaining remains intact because C boulders do not merge during `stackobj()`.

## Tests

- `hero rolling boulder monster hit clears no-charge at non-shop impact before shop final rest`

## Remaining Edges

- Full transient floor-list insertion, stack ordering for other object classes, and timer checks remain shared `place_object()` work.
- Matching-owner precedence across multiple adjacent shops remains broader shop-ownership parity.
- Special-object breakage, object-gone stopping, shifted-vampire revival, and special-object lethal attribution remain separate `ohitmon()` slices.
