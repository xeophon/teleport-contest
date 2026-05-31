# C-Parity Audit 347 - Generic Upward Knife-Family Dice

## Implemented Slice

Broadened the generic non-potion `toss_up()` path from dagger-family weapons to the normal non-artifact knife family for human-size hero self-hits. Canonical scalpel, knife, stiletto, worm tooth, and crysknife objects now use their C small-target damage dice before the existing upward-fall landing and HP-loss flow.

This keeps the audit 345 `dmgval()` subset ordering: small-target die, weapon enchantment, negative floor, greatest erosion minimum 1, then weight fallback only when weapon damage becomes zero.

## C Source

- `nethack-c/upstream/include/objects.h:114`: `WEAPON(...)` argument order identifies probability, weight, cost, small-target damage, large-target damage, hit bonus, damage type, skill, material, and color.
- `nethack-c/upstream/include/objclass.h:96-98`: `oc_wsdam` is the small-monster damage field used by `dmgval()`.
- `nethack-c/upstream/include/objects.h:215-233`: knife-family object metadata gives small-target dice: scalpel 3, knife 3, stiletto 3, worm tooth 2, and crysknife 10.
- `nethack-c/upstream/src/dothrow.c:1341-1349`: generic surviving upward self-hits call `dmgval(obj, &gy.youmonst)`.
- `nethack-c/upstream/src/dothrow.c:1356-1360`: zero `dmgval()` falls back to weight-derived damage capped at 6.
- `nethack-c/upstream/src/dothrow.c:1374-1380`: hard-helmet cap, `u.udaminc`, negative-damage floor, and `Maybe_Half_Phys()` run after object damage.
- `nethack-c/upstream/src/dothrow.c:1420-1423`: surviving damaging objects land via `hitfloor(obj, TRUE)` before HP loss.
- `nethack-c/upstream/src/weapon.c:263-265`: normal-size targets use `rnd(objects[otyp].oc_wsdam)`.
- `nethack-c/upstream/src/weapon.c:297-302`: weapon enchantment is added and negative weapon damage is floored to zero.
- `nethack-c/upstream/src/weapon.c:327-342`: blessed and silver target-form bonuses exist in `dmgval()` but remain deferred here.
- `nethack-c/upstream/src/weapon.c:344-352`: positive weapon damage subtracts `greatest_erosion()` but is kept at minimum 1.

## JS Behavior

- `js/cmd.js`: renamed the upward small-damage table/helper from dagger-specific to weapon-specific.
- `js/cmd.js`: added small-target dice for `scalpel`, `knife`, `stiletto`, `worm tooth`, and `crysknife`.
- `js/cmd.js`: added numeric `otyp` support for `KNIFE` and `STILETTO`; scalpel, worm tooth, and crysknife currently rely on exact `actualKind`/`kind` identity via `objectKindKey()`.
- `js/cmd.js`: keeps artifact exclusion and preserves the existing branch order: fragile/breakable objects first, generic damaging weapons next, harmless missiles after that.

## Regression Coverage

- `upward hero-thrown knife uses knife small-target damage`
- `upward hero-thrown stiletto uses knife-family small-target damage`
- `upward hero-thrown scalpel uses knife-family small-target damage`
- `upward hero-thrown worm tooth uses knife-family small-target damage`
- `upward hero-thrown crysknife uses crysknife small-target damage`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'upward hero-thrown (knife|stiletto|scalpel|worm tooth|crysknife|elven dagger|unknown orcish dagger|silver dagger|athame|enchanted dagger|rusty dagger|negatively enchanted dagger|blessed dagger|plain dagger|tin opener|unpaid dagger stack)' test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`

## Deferred

- Numeric `otyp` constants/support for scalpel, worm tooth, and crysknife in `js/cmd.js`.
- Registry/factory/wish consolidation for non-random knife-family objects; current random weapon factory coverage only naturally creates knife and stiletto.
- Knife-family enchantment, erosion, negative-enchantment, hard-helmet, unpaid-stack, no-ceiling, underwater, and polyself target-form matrices beyond the shared generic formula already used by this path.
- Blessed-vs-undead/demon and silver-hate target-form bonuses, artifact `artifact_hit()` effects, large and unusual polyself target sizing, shade/xorn/thick-skin harmless paths, returning weapons, and broader generic upward weapon classes.
