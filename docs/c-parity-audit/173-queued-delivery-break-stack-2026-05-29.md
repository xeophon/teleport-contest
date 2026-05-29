# Queued Delivery Break Stack 2026-05-29

Implemented queued down-gate delivery arrival parity for silent breakage and exact-route stacking. No private fixtures were inspected or encoded.

## C Anchors

- `obj_delivery()` removes destination-matching migrating objects from the migration list and decodes the destination route: `nethack-c/upstream/src/dokick.c:1769`, `nethack-c/upstream/src/dokick.c:1784`.
- Exact stair, ladder, and special-stair routes find the reciprocal stairway from the source level before placement: `nethack-c/upstream/src/dokick.c:1802`.
- Exact arrivals place the object, skip breakage only on soft terrain, and use silent `breaktest()`/`delobj()` for ordinary migrations: `nethack-c/upstream/src/dokick.c:1824`, `nethack-c/upstream/src/dokick.c:1826`, `nethack-c/upstream/src/dokick.c:1830`.
- Surviving exact arrivals call `stackobj(otmp)`: `nethack-c/upstream/src/dokick.c:1836`.
- Random arrivals use `rloco()` and the same silent `breaktest()`/`delobj()` path: `nethack-c/upstream/src/dokick.c:1841`, `nethack-c/upstream/src/dokick.c:1845`.
- `stackobj()` merges compatible existing floor objects into the newly placed object: `nethack-c/upstream/src/invent.c:4363`.
- `IS_SOFT()` includes air, cloud, and pool terrain: `nethack-c/upstream/include/rm.h:140`.

## JS Work

- Added `impactDropDeliveryLandingIsSoft()` and imported `IS_SOFT` so queued delivery breakage matches C's hard-landing guard.
- Changed `deliverQueuedImpactDroppedObjects()` to run silent delivery-time break checks for both exact-route and random-route queued objects.
- Changed exact stair/ladder/special-stair delivery to push the arriving object first and then call `stackDroppedFloorObject(obj)`, preserving the arriving object as the merged stack survivor like `stackobj(otmp)`.
- Kept ordinary queued arrival message-free; delivery-time breakage does not call the messageful falling-object delivery helper.

JS anchors: `js/cmd.js:3440`, `js/cmd.js:3445`, `js/cmd.js:3459`, `js/cmd.js:3463`.

## Public Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `command carried drop down ladder stacks on reciprocal ladder arrival`
- `queued exact down-gate delivery silently breaks fragile impacted pile`
- `queued random delivery silently breaks fragile object after landing roll`

Focused verification:

- `node --check js/cmd.js`
- `node --test --test-name-pattern "delivers on reciprocal|stacks on reciprocal|queued exact down-gate delivery|queued random delivery|projectile down ladder|command carried drop down ladder" test/shop-billing-helpers.test.mjs`

## Fresh Follow-Up Findings

A parallel kicked-object audit found that `#kick` still lacks ordinary adjacent floor-object selection:

- C checks ordinary objects before doors and terrain fallback, then starts kicked-object flight with `bhit(..., KICKED_WEAPON, ...)`. Anchors: `nethack-c/upstream/src/dokick.c:1452`, `nethack-c/upstream/src/dokick.c:489`, `nethack-c/upstream/src/dokick.c:733`.
- The minimal next slice should cover one non-shop, non-container, non-gold, adjacent ordinary floor object and the down-gate one square beyond the source object. Anchors: `nethack-c/upstream/src/zap.c:3846`, `nethack-c/upstream/src/zap.c:4049`.
- Source-side `hero_breaks()` and later `ship_object()` breakage are distinct paths and should not be collapsed into projectile landing helpers. Anchors: `nethack-c/upstream/src/dokick.c:678`, `nethack-c/upstream/src/dokick.c:1717`.

A parallel command audit selected throw-prompt count parsing as a small `getobj(GETOBJ_ALLOWCNT)` slice:

- C `dothrow()` calls `getobj("throw", throw_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT)`: `nethack-c/upstream/src/dothrow.c:371`.
- C `getobj()` treats prompt digits as a count and rejects counted non-gold throws through the "can only throw one at a time" branch: `nethack-c/upstream/src/invent.c:1937`, `nethack-c/upstream/src/invent.c:2028`.
- JS currently treats a digit inside `throwObject` as an inventory letter miss. JS anchor: `js/cmd.js:53857`.

A parallel object-name audit selected C `readobjnam` object ranges for `bag`, `candle`, and `horn`:

- C `o_ranges[]` dispatches generic names through weighted `rnd_class(...)`: `nethack-c/upstream/src/objnam.c:3345`, `nethack-c/upstream/src/objnam.c:4670`, `nethack-c/upstream/src/objnam.c:5403`.
- JS has exact wish rows for concrete bags/candles/horns but no generic range row, so generic tool fallback can misresolve `bag` and `horn`. JS anchors: `js/cmd.js:1424`, `js/cmd.js:29709`, `js/mklev.js:4194`.

## Remaining Gaps

- Kicked-object floor selection and down-gate shipping remain separate.
- Throw-prompt count parsing remains separate reusable `getobj()` work.
- Generic wish object ranges for `bag`, `candle`, and `horn` remain separate registry/parser work.
- Monster-thrown hit-state egg/mulch/passive behavior remains separate.
