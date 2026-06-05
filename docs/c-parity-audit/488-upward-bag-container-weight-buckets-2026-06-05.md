# C Parity Audit 488: Upward Bag Container Weight Buckets

Broadened upward bag-container falling damage to cover C's container weight formulas when contents make the damage bucket exceed 1. Kind-only bag records now use the same base weights as `otyp` records, bag of holding content reduction applies by object kind as well as object type, and heavier upward-thrown bags expose the expected `rnd(bucket)` damage roll.

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1588`: upward hero throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1216` through `:1246`: `harmless_missile()` makes nonempty sacks, oilskin sacks, and bags of holding damaging.
- `nethack-c/upstream/src/dothrow.c:1341` through `:1360`: generic upward falling-object damage uses `dmgval()` first, then `ceil(obj->owt / WT_TO_DMG)`, calls `rnd(bucket)` when the bucket exceeds 1, and caps final weight-derived damage at 6.
- `nethack-c/upstream/include/weight.h:17`: `WT_TO_DMG` is 100.
- `nethack-c/upstream/include/objects.h:905` through `:912`: sack, oilskin sack, bag of holding, and bag of tricks all have base weight 15.
- `nethack-c/upstream/src/mkobj.c:1888` through `:1955`: container weight is base plus recursive contents weight; bag of holding uses cursed `2x`, blessed `ceil(x / 4)`, and uncursed `ceil(x / 2)` content weight.

## JS Changes

- `js/cmd.js`
  - Made `globContents()` merge and id-deduplicate nonempty `contents` and `cobj` arrays and fall back to nonempty `cobj` when `contents` exists but is empty.
  - Added explicit local weights for `oilskin sack` and `bag of holding`.
  - Made container base-weight detection recognize C container names as well as object type constants.
  - Made generic container weight detection recognize name-only bag containers.
  - Applied bag-of-holding content adjustment through the existing bag-of-holding recognizer instead of only `otyp === BAG_OF_HOLDING`.

## Tests

- `upward hero-thrown kind-only oilskin sack uses full contents weight damage`
- `upward hero-thrown kind-only bag of holding halves contents weight when uncursed`
- `upward hero-thrown bag of holding counts cobj contents when contents list is empty`
- `upward hero-thrown blessed bag of holding quarters contents weight`
- `upward hero-thrown cursed bag of holding doubles contents weight before cap`

The tests use a loadstone inside each bag so the RNG log exposes the C bucket: `rnd(6)` for an oilskin sack with full contents weight, `rnd(3)` for an uncursed bag of holding including a `cobj`-only fixture, `rnd(2)` for a blessed bag of holding, and `rnd(11)` before the weight-damage cap for a cursed bag of holding.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown (kind-only oilskin sack|kind-only bag of holding|bag of holding counts cobj|blessed bag of holding|cursed bag of holding|charged bag of tricks|uncharged bag of tricks|nonempty sack)" test/shop-billing-helpers.test.mjs` - pass, 8 matching tests
- `node --test test/save-bones.test.mjs` - pass
- `node --test` - pass, 1938 tests
- `npm run score` - pass, 44/44 public sessions

## Remaining

- Full C parity still needs silver/blessed form bonuses, special polyself target forms, soft terrain, fatal heavy-container canaries, and deeper `hitfloor()` landing side effects beyond the currently modeled paths.
