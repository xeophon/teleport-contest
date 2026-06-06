# Rolling Boulder Shared-Boundary No-Charge

Date: 2026-06-06

## Scope

Cover the shared-room shop-boundary portion of C `place_object()` `no_charge` cleanup for rolling boulders that come to rest after `launch_obj()`.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3566` through `:3571` clears the surviving rolling object's `otrapped`, calls `place_object(singleobj, x2, y2)`, redraws the final square, and returns the placed-object result.
- `nethack-c/upstream/src/mkobj.c:2356` through `:2359` preserves `no_charge` only when final placement is a `costly_spot()` or `costly_adjacent(find_objowner(...))`; otherwise it clears the flag.
- `nethack-c/upstream/src/shk.c:5350` through `:5362` defines `costly_spot()` as a tended shop interior and excludes the shopkeeper's free spot.
- `nethack-c/upstream/src/shk.c:5365` through `:5380` keeps `no_charge` valid at shop edge squares and the shopkeeper free spot through `costly_adjacent()`.
- `nethack-c/upstream/src/shk.c:1084` through `:1118` has `find_objowner()` scan all shop rooms returned by `in_rooms()`, preferring a matching bill owner and otherwise using the first default shopkeeper.
- `nethack-c/upstream/src/hack.c:3510` handles `SHARED` and `SHARED_PLUS` room numbers by searching neighboring room ids for `in_rooms()`.

## JS Coverage

- `js/allmain.js` now resolves rolling-boulder final-rest shop rooms through a local helper that understands direct room numbers plus `SHARED` and `SHARED_PLUS` boundary squares.
- The helper mirrors the existing command-side shared-room scan shape without importing shop internals from `cmd.js`.
- A rolling boulder that rests on a shared shop edge square with an in-shop resident keeps `no_charge` and does not gain a bill row.
- A rolling boulder that rests on a non-edge shared square adjacent to a shop clears stale `no_charge`, matching the C requirement that shared-room preservation still be a costly-adjacent edge/free-spot case.

## Tests

- `rolling boulder final rest keeps no-charge on shared shop boundary`
- `rolling boulder final rest clears no-charge on non-edge shared shop-adjacent square`

## Remaining Edges

- Shared-boundary matching-bill-owner precedence across multiple adjacent shops is still part of broader shop ownership parity.
- Generic `obj_timer_checks()` parity belongs in shared floor placement, not rolling-boulder-only code.
- Hero-triggered rolling boulder still uses the simplified command-side launcher and does not yet share the full monster `launch_obj()` path.
