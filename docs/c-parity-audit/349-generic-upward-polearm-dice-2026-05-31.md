# C-Parity Audit 349 - Generic Upward Polearm Dice

## Implemented Slice

Broadened the generic non-potion `toss_up()` weapon self-hit path from common weapons to the `P_POLEARMS` rows. Normal hero self-hits now use C small-target `dmgval()` dice for polearms with exact canonical object names, including `+1` for spetum and `+rnd(4)` for ranseur, bardiche, voulge, guisarme, bill-guisarme, and lucern hammer.

This keeps the audit 345/348 modeled order: C break/harmless checks first, then small-target die, small-target switch bonus, weapon enchantment, negative floor, erosion minimum 1, and weight fallback only when weapon damage becomes zero.

## C Source

- `nethack-c/upstream/include/objects.h:114`: `WEAPON(...)` argument order identifies probability, weight, cost, small-target damage, large-target damage, hit bonus, damage type, skill, material, and color.
- `nethack-c/upstream/include/objclass.h:96-98`: `oc_wsdam` is the small-monster damage field used by `dmgval()`.
- `nethack-c/upstream/include/objects.h:292-341`: polearm rows and small-target dice: partisan d6, ranseur d4, spetum d6, glaive d6, halberd d10, bardiche d4, voulge d4, fauchard d6, guisarme d4, bill-guisarme d4, lucern hammer d4, bec de corbin d8.
- `nethack-c/upstream/include/objects.h:343-350`: dwarvish mattock and lance are adjacent but explicitly not `P_POLEARMS`; this slice leaves them under their existing common-weapon coverage.
- `nethack-c/upstream/src/dothrow.c:1256-1341`: `toss_up()` checks breakage and harmless cases before the generic damage branch.
- `nethack-c/upstream/src/dothrow.c:1341-1349`: generic surviving upward self-hits call `dmgval(obj, &gy.youmonst)`.
- `nethack-c/upstream/src/dothrow.c:1356-1360`: zero `dmgval()` falls back to weight-derived damage capped at 6.
- `nethack-c/upstream/src/weapon.c:263-265`: normal-size targets use `rnd(objects[otyp].oc_wsdam)`.
- `nethack-c/upstream/src/weapon.c:267-275`: small-target `SPETUM` adds a flat 1 damage.
- `nethack-c/upstream/src/weapon.c:278-289`: small-target `BARDICHE`, `BILL_GUISARME`, `GUISARME`, `LUCERN_HAMMER`, `RANSEUR`, and `VOULGE` add `rnd(4)`.
- `nethack-c/upstream/src/weapon.c:297-302`: weapon enchantment is added and negative weapon damage is floored to zero.
- `nethack-c/upstream/src/weapon.c:327-352`: target-form bonuses and erosion still run after base weapon damage; those broader target-form cases remain deferred here.

## JS Behavior

- `js/cmd.js`: extended `HERO_TOSS_UP_WEAPON_SMALL_DAMAGE` with exact-name polearm entries.
- `js/cmd.js`: added numeric `otyp` keying for `GLAIVE`, the only polearm constant already present in `cmd.js`.
- `js/cmd.js`: relies on `actualKind || kind` for the remaining polearms. Random weapon generation already stores exact `actualKind` for all polearm rows, while direct `mongets()`/wish coverage remains uneven.

## Regression Coverage

- `upward hero-thrown glaive uses polearm base small-target die`
- `upward hero-thrown spetum adds flat small-target polearm bonus`
- `upward hero-thrown ranseur adds rnd4 small-target polearm bonus`
- `upward hero-thrown bill-guisarme keys hyphenated polearm actualKind`
- `upward hero-thrown bec de corbin uses polearm base d8 damage`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'upward hero-thrown (glaive|spetum|ranseur|bill-guisarme|bec de corbin|long sword|mace|broadsword)' test/shop-billing-helpers.test.mjs`

## Deferred

- Full numeric `otyp` support in `cmd.js` for polearms that currently lack local constants.
- Exact wish metadata for polearms other than `glaive`.
- Direct `mongets()`/`mksobj()` canonical naming for partisan, ranseur, spetum, halberd, bardiche, voulge, fauchard, guisarme, bill-guisarme, and bec de corbin.
- Blessed-vs-undead/demon, axe-vs-wooden, silver-hate, artifact light, artifact `artifact_hit()`, large and unusual polyself target sizing, shade/xorn/thick-skin harmless paths, hard-helmet matrices for every polearm, shop-stack billing variants, no-ceiling wording, and underwater wording.
