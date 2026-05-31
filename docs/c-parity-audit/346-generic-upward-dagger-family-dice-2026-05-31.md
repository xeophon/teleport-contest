# C-Parity Audit 346 - Generic Upward Dagger-Family Dice

## Implemented Slice

Broadened the generic non-potion `toss_up()` path from plain daggers to the normal non-artifact dagger family for human-size hero self-hits. Canonical dagger, elven dagger, orcish dagger, silver dagger, and athame objects now use their C small-target damage dice before the existing upward-fall landing and HP-loss flow.

This is a narrow follow-up to audit 345. It keeps the previously implemented `dmgval()` modifier order, but changes the base die from plain-dagger-only to the C `oc_wsdam` values for the supported dagger-family object identities.

## C Source

- `nethack-c/upstream/src/dothrow.c:1341-1349`: generic surviving upward self-hits call `dmgval(obj, &gy.youmonst)` before artifact-specific handling.
- `nethack-c/upstream/src/dothrow.c:1351-1354`: artifact upward effects are a separate `artifact_hit()` path and remain outside this slice.
- `nethack-c/upstream/src/dothrow.c:1356-1360`: zero `dmgval()` falls back to weight-derived damage capped at 6.
- `nethack-c/upstream/src/dothrow.c:1374-1380`: hard-helmet cap, `u.udaminc`, negative-damage floor, and `Maybe_Half_Phys()` run after object damage.
- `nethack-c/upstream/src/dothrow.c:1420-1423`: surviving damaging objects land via `hitfloor(obj, TRUE)` before HP loss.
- `nethack-c/upstream/src/weapon.c:263-265`: normal-size targets use `objects[otyp].oc_wsdam`.
- `nethack-c/upstream/src/weapon.c:297-302`: weapon enchantment is added and negative weapon damage is floored to zero.
- `nethack-c/upstream/src/weapon.c:327-342`: blessed and silver target-form bonuses exist in `dmgval()` but remain deferred here because the current JS hero-form model does not route those target predicates through this upward path yet.
- `nethack-c/upstream/src/weapon.c:344-352`: positive weapon damage subtracts `greatest_erosion()` but is kept at minimum 1.
- `nethack-c/upstream/include/objects.h:199-214`: dagger-family object metadata gives small-target dice: dagger 4, elven dagger 5, orcish dagger 3, silver dagger 4, and athame 4.

## JS Behavior

- `js/cmd.js`: extended `HERO_TOSS_UP_DAGGER_SMALL_DAMAGE` to include `elven dagger`, `orcish dagger`, `silver dagger`, and `athame` with their C small-target dice.
- `js/cmd.js`: renamed the plain-dagger gate to a supported upward dagger-family gate and kept artifact exclusion through `artifact`/`oartifact`.
- `js/cmd.js`: treats numeric `DAGGER` and `ORCISH_DAGGER` as canonical dagger-family keys, while elven dagger, silver dagger, and athame currently rely on exact `actualKind`/`kind` identity via `objectKindKey()`.
- `js/cmd.js`: keeps potion, cream pie, venom, egg, corpse, crackable armor, and fragile object upward branches ahead of the generic damaging branch.

## Regression Coverage

- `upward hero-thrown elven dagger uses elven small-target damage`
- `upward hero-thrown unknown orcish dagger uses crude dagger wording and orcish damage`
- `upward hero-thrown silver dagger uses ordinary damage without silver-hate bonus`
- `upward hero-thrown athame uses dagger-family small-target damage`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'upward hero-thrown (elven dagger|unknown orcish dagger|silver dagger|athame|enchanted dagger|rusty dagger|negatively enchanted dagger|blessed dagger|plain dagger|tin opener|unpaid dagger stack)' test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`

## Deferred

- Appearance-only object identities such as `runed dagger` without `actualKind: 'elven dagger'`.
- `ELVEN_DAGGER`, `SILVER_DAGGER`, and `ATHAME` numeric `otyp` support in `js/cmd.js`.
- Object registry/factory consolidation for dagger-family weights, costs, appearances, wishability, and direct `mksobj()` materialization.
- Blessed-vs-undead/demon and silver-hate target-form bonuses.
- Artifact `artifact_hit()` effects for Grimtooth, Sting, Magicbane, or other artifact dagger-family cases.
- Large and unusual polyself target sizing, shade/xorn/thick-skin harmless paths, knives and stilettos, returning weapons, and broader generic upward weapon classes.
