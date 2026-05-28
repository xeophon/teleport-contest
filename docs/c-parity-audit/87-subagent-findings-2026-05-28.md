# Audit 87: Stone-to-Flesh Smell and Equipment State

Date: 2026-05-28

## Implemented Slice

This slice implements the narrow stone-to-flesh parity gap selected from the read-only subagent audits:

- carried stone-to-flesh replacements preserve wielded, alternate, quivered, and compatible meat-ring worn state;
- post-transform merge skips now see the preserved equipment state, matching C's `owornmask` skip intent;
- meat rings transformed from worn mineral/gemstone rings display their preserved hand;
- stone-to-flesh smell wording now branches to `You smell a delicious smell.` for non-Monk heroes who have broken vegetarian conduct and are explicitly in a carnivorous polyform.

## C Anchors

- `nethack-c/upstream/src/zap.c:1739`: `poly_obj()` preserves quantity, `no_charge`, inventory letter, `recharged`, and BUC across object polymorphs.
- `nethack-c/upstream/src/zap.c:1900`: `poly_obj()` swaps the object while retaining old worn-mask context.
- `nethack-c/upstream/src/zap.c:1921`: weapon, alternate weapon, quiver, and compatible worn slots are reattached after replacement.
- `nethack-c/upstream/src/zap.c:2097`: stone-to-flesh smell text depends on Monk role, vegetarian conduct, and `carnivorous(gy.youmonst.data)`.
- `nethack-c/upstream/src/zap.c:2984`: self-cast post-transform merge skips worn items.
- `nethack-c/upstream/src/worn.c:334`: `MEAT_RING` can occupy left/right ring slots.

## JS Touch Points

- `js/cmd.js`: `replaceInventoryObjectWithPolymorphResult()` gained an opt-in preservation callback so ordinary polymorph dipping stays unchanged.
- `js/cmd.js`: stone-to-flesh inventory transforms pass `preserveStoneToFleshEquipmentState()`.
- `js/cmd.js`: stone-to-flesh inventory and floor paths use a shared smell helper.
- `js/cmd.js`: inventory display now treats worn meat rings as ring-slot compatible food and can show quivered food suffixes without forcing weapon enchantment display.
- `test/shop-billing-helpers.test.mjs`: added focused coverage for delicious-vs-odor wording and preserved wielded/quivered/worn state.

## Deferred Gaps

- Canonical monster metadata still needs C-shaped `M1_CARNIVORE` population so ordinary `becomeMonster()` forms can drive the smell branch without test-local flags.
- Statue and figurine stone-to-flesh rows remain deferred until the monster/statue lifecycle is less ad hoc.
- Sokoban boulder guilt and broader `poly_obj()` fallout remain separate source-backed slices.

## Additional Subagent Follow-Ups

- Forced chest: source-backed next slice is 50-turn/no-hands cleanup, real `exercise()` calls, and registry-backed `oc_wldam * 2` force chance.
- Projectile landing/shop transfer: source-backed next slice is pre-placement `flooreffects()`/`ship_object()` gating in `landProjectileObjectWithShopHandling()`.
- Potionhit lifecycle: lethal blessed-water hits on shifted vampire forms should revive through a `vamprises()`-style path before ordinary death cleanup.

## Verification

Focused checks run before documentation update:

```bash
node --check js/cmd.js
node --check test/shop-billing-helpers.test.mjs
node --test --test-reporter=spec --test-name-pattern 'stone to flesh' test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
npm run score
```

Result: focused stone-to-flesh tests pass, `24` run and `722` skipped under the name filter; full helper suite passes `746/746`; public score remains `44/44`.
