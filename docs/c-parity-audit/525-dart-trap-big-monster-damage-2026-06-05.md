# Dart trap big monster damage

## C anchors

- `trap.c:1309` creates a dart trap projectile with `t_missile(DART, trap)`.
- `trap.c:1020` creates that trap projectile through `mksobj(otyp, TRUE, FALSE)`, then `trap.c:1022` forces the projectile quantity to one.
- `trap.c:1314` sends the dart through `thitm(7, mtmp, otmp, 0, FALSE)`.
- `trap.c:6747` computes monster-hit damage with `dmgval(obj, mon)`, then clamps the result to at least 1.
- `weapon.c:225`/`weapon.c:263` choose `oc_wldam` for big monsters and `oc_wsdam` for non-big monsters.
- `objects.h:160` defines dart small-monster damage as 3 and large-monster damage as 2.

## JS gap

- Both normal-monster and pet dart trap branches used `rnd(3)` for all hit targets.
- That matched the C small-target dart row, but over-rolled big monsters that should use dart large-target damage.

## Change

- Add `trapDartDamage(mon)` and route both dart trap branches through it.
- The helper uses the current JS monster size flags (`mon.big`, `mon.bigmonst`, `mon.data.big`, `mon.data.bigmonst`) to choose `rnd(2)` for big monsters and `rnd(3)` otherwise, with the same minimum-1 clamp used by `thitm()`.

## Coverage

- `dart trap hit uses large monster dart damage roll` verifies a normal big monster hit consumes `rnd(2)` for trap damage and subtracts that amount.
- `pet dart trap hit uses large monster dart damage roll` covers the same large-target damage rule through the pet trap path.
- Existing small-target pet coverage still verifies ordinary non-big trap darts use `rnd(3)`.

## Follow-up

- This is still base-dice parity, not full `dmgval()` parity. C trap darts keep the `mksobj()` projectile's `spe`, blessed/cursed state, and erosion state; `dmgval()` applies enchantment, blessed-vs-hated bonuses, silver/material bonuses where applicable, and erosion penalties.
- `thitm()` also uses the projectile enchantment in hit chance, while the JS dart trap branches still use a fixed `+7` hit value.
- The current size test follows the JS monster data flags. A broader monster-data parity pass may need to align every monster's C `bigmonst()` classification before size-sensitive damage can be complete.
