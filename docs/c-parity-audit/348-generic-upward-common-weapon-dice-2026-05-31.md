# C-Parity Audit 348 - Generic Upward Common-Weapon Dice

## Implemented Slice

Broadened the generic non-potion `toss_up()` path from dagger/knife-family weapons to common non-artifact weapons that can use exact canonical object names in JS. Normal hero self-hits now use C small-target `dmgval()` dice for spear, axe, sword, bludgeon, lance, and bullwhip rows, including the small-target switch additions for mace-family `+1` cases and broadsword/battle-axe/morning-star `+rnd(4)` cases.

The implementation preserves the existing audit 345/347 ordering for this modeled hero target: harmless-missile pre-checks such as unenchanted rubber hose first, then small-target die, C switch bonus, weapon enchantment, negative floor, erosion minimum 1, and weight fallback only when weapon damage becomes zero.

## C Source

- `nethack-c/upstream/include/objects.h:114`: `WEAPON(...)` argument order identifies probability, weight, cost, small-target damage, large-target damage, hit bonus, damage type, skill, material, and color.
- `nethack-c/upstream/include/objclass.h:96-98`: `oc_wsdam` is the small-monster damage field used by `dmgval()`.
- `nethack-c/upstream/include/objects.h:174-195`: spear, spear variants, javelin, and trident small-target dice.
- `nethack-c/upstream/include/objects.h:236-280`: axe, battle-axe, short-sword variants, scimitar, silver saber, broadsword variants, long sword, two-handed sword, and katana small-target dice.
- `nethack-c/upstream/include/objects.h:348-391`: lance, mace-family, club, rubber hose, quarterstaff, aklys, flail, and bullwhip small-target dice.
- `nethack-c/upstream/src/dothrow.c:1219-1235`: `harmless_missile()` makes `RUBBER_HOSE` harmless while `spe < 1`, before the generic damage path.
- `nethack-c/upstream/src/dothrow.c:1341-1349`: generic surviving upward self-hits call `dmgval(obj, &gy.youmonst)`.
- `nethack-c/upstream/src/dothrow.c:1356-1360`: zero `dmgval()` falls back to weight-derived damage capped at 6.
- `nethack-c/upstream/src/dothrow.c:1374-1380`: hard-helmet cap, `u.udaminc`, negative-damage floor, and `Maybe_Half_Phys()` run after object damage.
- `nethack-c/upstream/src/dothrow.c:1420-1423`: surviving damaging objects land via `hitfloor(obj, TRUE)` before HP loss.
- `nethack-c/upstream/src/weapon.c:263-265`: normal-size targets use `rnd(objects[otyp].oc_wsdam)`.
- `nethack-c/upstream/src/weapon.c:267-275`: small-target `MACE`, `SILVER_MACE`, `WAR_HAMMER`, `FLAIL`, and `TRIDENT` add a flat 1 damage.
- `nethack-c/upstream/src/weapon.c:278-289`: small-target `BATTLE_AXE`, `MORNING_STAR`, `BROADSWORD`, and `ELVEN_BROADSWORD` add `rnd(4)`.
- `nethack-c/upstream/src/weapon.c:297-302`: weapon enchantment is added and negative weapon damage is floored to zero.
- `nethack-c/upstream/src/weapon.c:327-342`: blessed, silver, wooden-target, and artifact-light target bonuses exist in `dmgval()` but remain deferred here.
- `nethack-c/upstream/src/weapon.c:344-352`: positive weapon damage subtracts `greatest_erosion()` but is kept at minimum 1.

## JS Behavior

- `js/cmd.js`: extended `HERO_TOSS_UP_WEAPON_SMALL_DAMAGE` with common exact-name weapon entries.
- `js/cmd.js`: allowed table entries to be either a single die or `{ die, add, bonusDie }`, matching C's base die plus small-target switch additions.
- `js/cmd.js`: keeps `rubber hose` gated by `spe >= 1` so unenchanted hoses still run through the harmless upward path before generic weapon damage.
- `js/cmd.js`: added numeric `otyp` keying for the sword variants, scimitar, silver saber, flail, and bullwhip constants already present in `cmd.js`; broader objects without local constants rely on exact `actualKind`/`kind`.
- `js/cmd.js`: keeps artifact exclusion and preserves branch ordering around fragile objects, generic damaging upward objects, harmless missiles, landing, and HP loss.

## Regression Coverage

- `upward hero-thrown long sword uses base small-target die`
- `upward hero-thrown mace adds flat small-target switch bonus`
- `upward hero-thrown broadsword adds rnd4 small-target switch bonus`
- `upward hero-thrown elven broadsword keys exact variant and adds rnd4 bonus`
- `upward hero-thrown silver mace keys exact variant and avoids silver bonus for hero`
- `upward hero-thrown unenchanted rubber hose stays harmless`
- `upward hero-thrown enchanted rubber hose uses small-target die after harmless check`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'upward hero-thrown (long sword|mace|broadsword|elven broadsword|silver mace|unenchanted rubber hose|enchanted rubber hose|knife|stiletto|crysknife|plain dagger)' test/shop-billing-helpers.test.mjs`

## Deferred

- Full numeric `otyp` coverage for spear, axe, battle-axe, mace, silver mace, war hammer, club, morning star, trident, lance, rubber hose, quarterstaff, and aklys in `cmd.js`.
- Polearm families and launcher/ammunition oddities beyond the common rows modeled here.
- Registry/factory/wish consolidation for broader weapon object metadata and appearance hiding.
- Blessed-vs-undead/demon, axe-vs-wooden, silver-hate, artifact light, artifact `artifact_hit()`, large and unusual polyself target sizing, shade/xorn/thick-skin harmless paths, hard-helmet matrices for every new weapon, returning weapons, shop-stack billing variants, no-ceiling wording, and underwater wording.
