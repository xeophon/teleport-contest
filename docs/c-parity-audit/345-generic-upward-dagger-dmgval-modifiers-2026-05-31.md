# C-Parity Audit 345 - Generic Upward Dagger Dmgval Modifiers

## Implemented Slice

Broadened the generic non-potion `toss_up()` path for hero-thrown non-artifact daggers. Plain daggers now use the C `dmgval()` modifier order for normal human-size hero self-hits: small-target damage die, weapon enchantment, negative-enchantment floor, greatest erosion subtraction with minimum 1, and weight fallback when `dmgval()` becomes zero.

## C Source

- `nethack-c/upstream/src/dothrow.c:1341-1349`: generic surviving upward self-hits enter the non-potion/non-breakable branch and call `dmgval(obj, &gy.youmonst)`.
- `nethack-c/upstream/src/dothrow.c:1356-1360`: zero `dmgval()` falls back to weight-derived damage capped at 6.
- `nethack-c/upstream/src/dothrow.c:1374-1380`: hard-helmet cap, `u.udaminc`, negative-damage floor, and `Maybe_Half_Phys()` run after object damage.
- `nethack-c/upstream/src/dothrow.c:1420-1423`: surviving damaging objects land via `hitfloor(obj, TRUE)` before HP loss.
- `nethack-c/upstream/src/weapon.c:263-265`: normal-size targets use `objects[otyp].oc_wsdam`.
- `nethack-c/upstream/src/weapon.c:297-302`: weapon enchantment is added and negative weapon damage is floored to zero.
- `nethack-c/upstream/src/weapon.c:344-352`: positive weapon damage subtracts `greatest_erosion()` but is kept at minimum 1.
- `nethack-c/upstream/include/objects.h:199-202`: dagger is a stackable blade with small-target damage 4 and weight 10.
- `nethack-c/upstream/include/weight.h:17`: `WT_TO_DMG` is 100, so a zero-damage dagger fallback is fixed at 1 damage with no extra RNG.

## JS Behavior

- `js/cmd.js`: replaced the clean +0 dagger-only gate with a non-artifact plain-dagger gate.
- `js/cmd.js`: added C-shaped dagger `dmgval()` handling for `rnd(4)`, `spe`, negative floor, and greatest erosion before the existing weight fallback.
- `js/cmd.js`: kept artifact, silver-hate, blessed-vs-undead/demon, shade/xorn/thick-skin, large polyself, and broader dagger-family cases out of this slice.

## Regression Coverage

- `upward hero-thrown enchanted dagger uses weapon damage and lands`
- `upward hero-thrown rusty dagger reduces weapon damage and lands`
- `upward hero-thrown negatively enchanted dagger falls back to minimum weight damage`
- `upward hero-thrown blessed dagger keeps ordinary toss-up flow`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'upward hero-thrown (enchanted dagger|rusty dagger|negatively enchanted dagger|blessed dagger|plain dagger|tin opener|unpaid dagger stack)' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`

## Deferred

- Broader generic upward weapon impacts remain incomplete: elven/orcish/silver daggers, knives and stilettos, blessed/silver target-form bonuses, artifact `artifact_hit()` effects, large and unusual polyself target sizing, shade/xorn/thick-skin harmless paths, returning weapons, and broader object classes.
