# C Parity Audit 487: Upward Bag Container Generic Falling Damage

Implemented the C `toss_up()` harmless-vs-damaging split for upward-thrown bag containers. Charged bags of tricks now use the generic falling-object damage path, uncharged bags of tricks remain harmless, and nonempty sacks enter the same generic weight-damage path instead of falling through to direction help.

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1588`: upward hero throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1216` through `:1246`: `harmless_missile()` makes `BAG_OF_TRICKS` harmless only when `spe < 1`, and makes sacks, oilskin sacks, and bags of holding harmless only when `!Has_contents(obj)`.
- `nethack-c/upstream/src/dothrow.c:1256` through `:1285`: `toss_up()` performs the ceiling `breaktest()` before choosing `hits` vs `almost hits` wording.
- `nethack-c/upstream/src/dothrow.c:1289` through `:1340`: self-hit `breaktest()` runs before the harmless-object branch; harmless objects print `It doesn't hurt.` and land through `hitfloor(obj, FALSE)`.
- `nethack-c/upstream/src/dothrow.c:1341` through `:1360`: non-harmless, nonbreaking objects use `dmgval()` first, then weight-derived damage `ceil(obj->owt / WT_TO_DMG)`, with `rnd(bucket)` only when the bucket exceeds 1 and a cap of 6.
- `nethack-c/upstream/src/dothrow.c:1374` through `:1423`: C applies helmet and damage modifiers, then calls `hitfloor(obj, TRUE)` before HP loss from `falling object`.
- `nethack-c/upstream/include/objects.h:905` through `:912`: sack, oilskin sack, bag of holding, and bag of tricks all have base weight 15.
- `nethack-c/upstream/src/mkobj.c:1888` through `:1955`: container weight is base plus recursive contents weight; only bag of holding adjusts contents weight by blessed/cursed status.

## JS Changes

- `js/cmd.js`
  - Added bag of tricks to local object weight metadata as a 15-weight object.
  - Included bag of tricks in generic container weight calculation while keeping bag-of-holding content reduction limited to bag of holding.
  - Added a generic upward weight-container predicate that admits bags only after the C harmless-object predicate has rejected them.
  - Reused the existing generic upward object path for breaktest ordering, floor-hit wording, landing, and HP loss.

## Tests

- `upward hero-thrown charged bag of tricks uses generic weight damage and lands`
- `upward hero-thrown uncharged bag of tricks stays harmless`
- `upward hero-thrown nonempty sack uses generic weight damage and lands with contents`

The tests cover the C RNG order for the almost-hit path, charged-vs-uncharged bag-of-tricks behavior, no damaging floor-hit message for harmless bags, nonempty sack routing through generic damage, preserved container contents, and absence of command-assist fallback.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown (charged bag of tricks|uncharged bag of tricks|nonempty sack|pick-axe|tin opener)" test/shop-billing-helpers.test.mjs` - pass, 5 matching tests
- `git diff --check` - pass
- `node --test` - pass, 1933 tests
- `npm run score` - pass, 44/44

## Remaining

- Oilskin sack and bag-of-holding upward nonempty canaries are not yet dedicated, though the shared predicate now routes those C cases.
- Broader generic upward falling-object damage still needs heavier container buckets, silver/blessed form bonuses, special polyself target forms, soft terrain, and full landing side effects beyond the currently modeled paths.
