# Dart trap generated dart modifiers

## C anchors

- `trap.c:1018` `t_missile(DART, trap)` uses `mksobj(otyp, TRUE, FALSE)`, then forces quantity to one while preserving generated enchantment, blessing, curse, and erosion state.
- `trap.c:1309` creates the monster dart-trap projectile, then `trap.c:1310` applies the trap poison roll.
- `trap.c:1314` sends the dart through `thitm(7, mtmp, otmp, 0, FALSE)`.
- `trap.c:6724` includes `obj->spe` in the monster-hit threshold: `find_mac(mon) + tlev + obj->spe <= rnd(20)`.
- `trap.c:6747` computes hit damage with `dmgval(obj, mon)` and clamps the final monster-hit damage to at least 1.
- `weapon.c:297` adds weapon enchantment after base dice, floors negative damage to 0, then `weapon.c:327` applies blessed-vs-hated bonuses and `weapon.c:344` applies erosion last.

## JS gap

- The monster and pet dart-trap paths already created a real `mksobj(DART, true, false)`, but the generated dart only affected display/floor object state.
- Hit chance ignored `dart.spe`.
- Damage used only base dart dice, so generated enchantment, blessed bonuses, and erosion fields were ignored.

## Change

- Pass the generated dart into `trapDartDamage(dart, mon)`.
- Apply base small/large dart dice, `dart.spe`, blessed-vs-hated bonus, erosion subtraction, and the final minimum-1 clamp in C order.
- Include `dart.spe` in the normal-monster and pet dart-trap hit thresholds.

## Coverage

- `generated trap dart keeps positive enchantment and blessing state` verifies `mksobj(DART, true, false)` can produce a blessed enchanted dart through the real factory path.
- `generated trap dart reaches erosion RNG path after first move` documents the current factory erosion RNG path for darts.
- `dart trap damage uses generated blessed dart enchantment` verifies trap damage uses generated `spe` and blessed-vs-hated bonus.
- `cursed trap dart enchantment affects monster hit chance and damage floor` verifies `dart.spe` participates in the hit threshold and negative damage floors to one after a hit.

## Follow-up

- Monster dart-trap poison should remain display/floor-object state only; C `thitm()` does not apply poison effects for trap-vs-monster dart hits.
- Hero dart traps are still separate: C `thitu()` uses fixed `+7` hit chance, then applies hero poison handling after a hit.
- The JS `mksobj()` erosion helper currently consumes erosion RNG but does not persist `oeroded`/`oeroded2` for generated darts, so full erosion-state generation remains a factory-level follow-up.
