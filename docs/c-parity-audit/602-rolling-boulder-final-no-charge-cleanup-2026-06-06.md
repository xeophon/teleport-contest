# Rolling Boulder Final No-Charge Cleanup

Date: 2026-06-06

## Scope

Cover the `place_object()` shop-flag cleanup for a rolling boulder that survives `launch_obj()` and comes to rest outside a shop context.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3566` through `:3571` clears the surviving launched object's `otrapped`, calls `place_object(singleobj, x2, y2)`, redraws the final square, and returns the placed-object result.
- `nethack-c/upstream/src/mkobj.c:2351` through `:2354` sets the placed object's final `ox`, `oy`, and floor location.
- `nethack-c/upstream/src/mkobj.c:2356` through `:2359` clears `otmp->no_charge` when final placement is neither a `costly_spot()` nor `costly_adjacent(find_objowner(...))`.
- `nethack-c/upstream/src/shk.c:5350` through `:5362` defines `costly_spot()` as a tended shop interior, excluding the shopkeeper spot.
- `nethack-c/upstream/src/shk.c:5365` through `:5380` keeps shop boundary and free-spot cases valid through `costly_adjacent()`.
- `nethack-c/upstream/src/mkobj.c:2361` through `:2365` also inserts the object at the global floor-object head and runs object timer checks for timed objects. Ordinary boulders are not timed, so timer work remains outside this slice.

## JS Coverage

- `js/allmain.js` now checks rolling-boulder final rest against a local tended-shop predicate before updating final coordinates.
- A stale `no_charge` flag is cleared when the boulder comes to rest on a non-shop square, matching the C `place_object()` cleanup for the non-costly case.
- The rest helper still clears launch metadata, re-inserts the boulder as the top visible floor object, recalculates vision, and redraws the final square through the existing final-placement path.
- The change does not synthesize a shop bill row, matching C `place_object()`, which only validates `no_charge` state during final placement.

## Tests

- `rolling boulder final rest clears stale no-charge outside shop without billing`

## Remaining Edges

- Exact `costly_adjacent(find_objowner(...))` behavior for shop boundary and shop free-spot placement remains a separate shop-ownership slice.
- Generic `obj_timer_checks()` parity belongs in shared floor placement, not rolling-boulder-only code.
- Hero-triggered rolling boulder still uses the simplified command-side launcher and does not yet share the full monster `launch_obj()` path.
