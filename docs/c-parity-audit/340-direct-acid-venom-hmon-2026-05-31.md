# C Parity Audit 340: Direct Acid Venom Monster Hits

## Sources

- `nethack-c/upstream/src/dothrow.c:2256-2260`: hero-thrown eggs, cream pies, blinding venom, and acid venom share the direct `hmon()` path when the throw is guaranteed or `ACURR(A_DEX) > rnd(25)`; `hmon()` uses up the object.
- `nethack-c/upstream/src/uhitm.c:1319-1340`: the `ACID_VENOM` `hmon()` case prints harmless acid-resistance feedback or burn feedback, uses `dmgval(obj, mon)` for nonresistant targets, consumes the thrown object, suppresses generic hit text, and disables ordinary damage bonuses.
- `nethack-c/upstream/include/objects.h:1640-1643`: acid venom has base small and large damage `d6`.
- `nethack-c/upstream/src/weapon.c:245-249` and `nethack-c/upstream/src/weapon.c:292-294`: `dmgval()` adds an extra `rnd(6)` for acid venom against both large and small monsters, so the direct nonresistant hit is `2d6`.
- `nethack-c/upstream/include/monst.h:278`: `resists_acid(mon)` maps to the monster acid-resistance element check.
- `nethack-c/upstream/src/uhitm.c:1845-1870`: `hmon()` applies the computed damage before the hit message step; acid venom has already provided its own hit text.
- `nethack-c/upstream/src/uhitm.c:1923-1927`: surviving `hmon()` targets wake up through the normal via-attack path after damage and messages.

## JS Changes

- Broadened the direct hero-thrown venom branch so acid venom shares the blinding-venom hit gate and no-landing consumption path.
- Added `heroThrownAcidVenomHitMonster()` for the C `hmon()` behavior:
  - acid-resistant monsters get `Your venom hits ... harmlessly.`, no damage roll, object consumption, and survivor wake/anger handling;
  - nonresistant monsters get `Your venom burns ...!`, `rnd(6) + rnd(6)` damage, ordinary kill handling if HP drops to zero, and survivor wake/anger handling.
- Kept failed Dexterity hits on the existing miss and landing path.

## Tests

- `hero-thrown acid venom direct hit burns monster through hmon path` covers the direct hit gate, `2d6` damage RNG, wake/anger tail, object consumption, and no floor placement.
- `hero-thrown acid venom direct hit is harmless against acid resistance` covers the resistance message, no damage RNG, wake/anger tail, object consumption, and no floor placement.
- `hero-thrown unpaid acid venom stack direct hit bills the burned unit` covers one-unit stack splitting, live residual billing, and debit for the consumed thrown unit.

## Remaining Gaps

- Direct cream-pie `hmon()` still uses older local behavior and needs its own cleanup for `can_blnd()` defenses and hero-blind feedback.
- Broader `hmon()` side effects for venom kills, pet abuse/fleeing, guard anger, Elbereth/alignment penalties, and exact invisible/unseen monster naming remain outside this compact acid-venom slice.
