# Pet dart trap damage and spent trap

## C anchors

- `trap.c:1299` handles a spent known dart trap for any monster: if `trap->once && trap->tseen && !rn2(15)`, the trap is deleted and no missile fires.
- `trap.c:1309` creates the trap dart with `t_missile(DART, trap)`.
- `trap.c:1314` sends that dart through `thitm(7, mtmp, otmp, 0, FALSE)`.
- `trap.c:6747` computes hit damage with `dmgval(obj, mon)`, clamped to at least 1.
- `weapon.c:263` uses `objects[otyp].oc_wsdam` for small monsters; `objects.h:161` defines dart small-monster damage as `rnd(3)`.

## JS gap

- The normal monster dart branch already used `rnd(3)` damage and had the spent-known-trap deletion gate.
- The pet dart branch always subtracted 1 HP on hit.
- The pet dart branch fired even when `trap.once && trap.tseen && !rn2(15)` should delete the spent trap without launching another dart.

## Change

- Add the spent-known-trap deletion gate to the pet dart branch before creating the dart.
- Change pet dart hit damage from fixed 1 to `Math.max(1, rnd(3))`, matching the small-monster dart damage used by the normal branch and C's dart object damage.

## Coverage

- `pet dart trap hit uses dart damage roll` verifies a nonlethal pet hit consumes `rnd(3)` and subtracts that rolled amount.
- `pet known spent dart trap can vanish without firing` verifies a known spent pet dart trap can disappear before any dart hit/miss messaging or floor dart placement.

## Follow-up

- Full `dmgval()` parity remains broader than this slice: big monsters should use dart large-monster damage (`rnd(2)`), and weapon modifiers such as enchantment, erosion, and blessed-vs-hated bonuses are still simplified in both normal-monster and pet dart paths.
