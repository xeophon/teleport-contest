# 124 - Ghoul pet `dogfood()` branch

## Implemented slice

This slice adds the C ghoul-specific `dogfood()` branch to the JS pet food classifier. It covers old corpse preference, stale egg preference, starving fallback for fresh non-vegan corpses and fresh eggs, and ghoul rejection of ordinary food including stone-to-flesh meat.

## C references

- `nethack-c/upstream/src/dog.c:995` defines `dogfood()`.
- `nethack-c/upstream/src/dog.c:1040` through `dog.c:1051` are the ghoul special case: old non-lizard/non-lichen corpses are `DOGFOOD`, fresh non-vegan corpses are only `ACCFOOD` while starving, stale eggs are `CADAVER`, fresh eggs are only `ACCFOOD` while starving, and all other food is `TABU`.
- `nethack-c/upstream/include/obj.h:316` defines stale eggs as age more than `2 * MAX_EGG_HATCH_TIME`, with `MAX_EGG_HATCH_TIME` equal to 200.
- `nethack-c/upstream/include/mondata.h:232` defines the `vegan()` predicate used by the fresh-corpse starving branch.
- `nethack-c/upstream/src/dogmove.c:531` and `dogmove.c:543` route pet goal selection through `dogfood()` and only accept food below `MANFOOD`.

## JS changes

- `js/allmain.js:1890` adds C-shaped local helpers for old corpse age, stale egg age, and the vegan corpse predicate.
- `js/allmain.js:1929` adds the ghoul branch before the generic corpse/food handling so ghouls do not inherit ordinary carnivore stone-to-flesh meat preferences.
- `js/allmain.js:9700` now lets ghouls eat old corpses already underfoot instead of applying the stale-corpse poison suppression used by ordinary pets.
- `test/shop-billing-helpers.test.mjs:9186` covers old corpse and stale egg preference.
- `test/shop-billing-helpers.test.mjs:9204` covers fresh corpse starvation fallback and rejection of stone-to-flesh meat.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "ghoul pets" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `npm run score`

All passed. The full helper suite is 847/847 and public score remains 44/44.

## Deferred candidates from this explorer round

- Burning-oil door collateral: C `zap_over_floor()` reveals secret doors and burns closed doors during lit-oil blasts; do not add drawbridge destruction because C does not treat drawbridges as doors here.
- Projectile shipping through down stairs, down ladders, and special stairs: extend the existing hole/trapdoor `ship_object()` helper with `down_gate()`-style stair detection, preserving the ladder always-drop rule.
- Floor figurine stone-to-flesh animation: add non-shop floor figurine animation with `makemon(..., NO_MINVENT | MM_NOMSG)`, timer stop, floor deletion, and no meat smell before tackling shop billing.
- Ordinary non-petrifying corpse `toss_up()` self-hit: add the C-shaped upward branch with breaktest RNG, weight damage, landing before HP loss, and falling-object death cause.
- Destroyed ice-box survivor timers: call the existing `removedFromIcebox()` helper for surviving corpse contents from helper-level ice-box destruction without making ice boxes real `#force` targets.
