# Wish Shirt Range

Date: 2026-05-29

## Scope

Implement the C `readobjnam()` shirt range and concrete Hawaiian/T-shirt wish paths without relying on public or private fixture behavior.

## C Anchors

- `o_ranges[]` maps `shirt` to `HAWAIIAN_SHIRT..T_SHIRT`: `nethack-c/upstream/src/objnam.c:3359`.
- `readobjnam_postparse2()` dispatches matching ranges through `rnd_class()`: `nethack-c/upstream/src/objnam.c:4671`.
- `rnd_class()` uses weighted `rnd(sum)` when candidate `oc_prob` values are nonzero: `nethack-c/upstream/src/objnam.c:5407`.
- Hawaiian shirts have `oc_prob=8`, delay 0, weight 5, cost 3, AC 0, cloth material, and magenta color: `nethack-c/upstream/include/objects.h:603`.
- T-shirts have `oc_prob=2`, delay 0, weight 5, cost 2, AC 0, cloth material, and white color: `nethack-c/upstream/include/objects.h:606`.
- Concrete namedesc lookup adds one to the matched object's probability and consumes `rn2(maxprob)`: `nethack-c/upstream/src/objnam.c:3495`, `nethack-c/upstream/src/objnam.c:3517`.
- `tee shirt` is an alternate spelling that maps directly to `T_SHIRT`, while `t shirt` only matches canonical `T-shirt` through `wishymatch()` and still consumes namedesc RNG: `nethack-c/upstream/src/objnam.c:3401`, `nethack-c/upstream/src/objnam.c:3241`.
- Plural `shirts` singularizes to `shirt`, but armor has `oc_merge == 0`, so requested/plural quantity does not increase the created object count: `nethack-c/upstream/src/objnam.c:4448`, `nethack-c/upstream/src/objnam.c:5072`.

## JS Changes

- Added concrete synthetic shirt object IDs and wish base entries for Hawaiian shirts and T-shirts, preserving armor class, weight, plural names, and shop cost lookup.
- Added both shirts to `mklev.js` specific armor metadata so direct shirt object creation gets armor initialization RNG and object display color.
- Added `WISH_OBJECT_RANGES` entry for `shirt` with C weights 8/2, so generic `shirt` consumes `rnd(10)` before specific object creation.
- Added concrete namedesc bounds: `Hawaiian shirt` consumes `rn2(9)` and `T-shirt` consumes `rn2(3)`.
- Kept `tee shirt` as a direct spelling alias that skips namedesc, but moved `t shirt` to a normal alias so it still consumes the C-style `rn2(3)` path.
- Added `shirts` normalization while leaving non-mergeable armor quantity at one object.

## Tests

- Added public RNG-log coverage for generic `shirt` selecting both Hawaiian shirt and T-shirt through `rnd(10)`.
- Added exact-name coverage for `Hawaiian shirt`, `T-shirt`, and `t shirt`, including concrete RNG, `otyp`, class, quantity, weight, shop cost, and display article behavior.
- Added `tee shirt` coverage to guard the C alternate-spelling shortcut that does not consume namedesc RNG.
- Added `2 shirts` coverage to keep plural/count wording from leaking into non-mergeable armor quantity.

## Remaining Work

- Full `boots` range remains open because it spans several magical boot types that still need registry-backed metadata.
- Shirt metadata is now covered for wish creation, but broader object-registry consolidation is still needed to remove parser-local armor metadata tables.
