# Subagent Findings 79: Direct Polymorph Potionhit

## Scope

Implement direct hero-thrown potion of polymorph body hits through the shared `potionhit()` path. This slice covers the C ordering for common crash/chip/evaporation, polymorph-specific `bhitm()` resistance ordering, system shock, random monster form replacement, proportional HP transfer, and the worn-saddle no-op edge.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` through `dothrow.c:2265` route a successful hero-thrown potion hit to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1623` defines `potionhit()` as always consuming the potion.
- `nethack-c/upstream/src/potion.c:1644` through `potion.c:1650` roll worn-saddle interception before chip damage and before potion-specific body effects; polymorph uses the generic `!rn2(10)` saddle chance.
- `nethack-c/upstream/src/potion.c:1675` applies the common `rn2(5)` one-HP chip only when the saddle was not hit.
- `nethack-c/upstream/src/potion.c:1679` prints evaporation for non-oil, non-saddle visible hits.
- `nethack-c/upstream/src/potion.c:1721` through `potion.c:1726` make a polymorph potion saddle hit a no-op that can visibly wet the saddle.
- `nethack-c/upstream/src/potion.c:1885` through `potion.c:1887` delegate a non-saddle polymorph body hit to `bhitm(mon, obj)`.
- `nethack-c/upstream/src/zap.c:263` through `zap.c:316` share the wand/spell/potion polymorph hit case: long-worm guard, `resists_magm()`, potion-class `resist()`, 1-in-25 system shock for non-shapechangers, then `newcham()`.
- `nethack-c/upstream/src/zap.c:6124` through `zap.c:6141` define potion-class resistance as attack level 6 and `rn2(100 + attackLevel - defenderLevel) < monsterMR`.
- `nethack-c/upstream/src/mon.c:5278` through `mon.c:5485` define the `newcham()` core: reject immune/genocided/same forms, choose a new form, preserve HP proportionally, update monster data, print visible transform feedback, then handle equipment fallout.

## JS Findings

- `thrownPotionEffectKind()` already recognized polymorph potions by actual name or potion index.
- `supportsHeroThrownPotionHit()` excluded polymorph, so a dex-successful thrown polymorph potion could fall through to generic thrown-object landing instead of C's `potionhit()`/`bhitm()` path.
- JS had object polymorph and hero polyself helpers but no reusable monster `newcham()` helper. Existing monster shapechange code in `allmain.js` already showed the local pattern for proportional HP transfer using `adjustedMonsterLevel()` and `monster_hp()`.

## Implementation

- Added polymorph support to the direct hero-thrown potionhit gate.
- Broadened direct saddle interception to include polymorph potions, so a saddle hit wets the saddle, skips evaporation, skips body polymorph, and leaves the monster asleep/peaceful as C does.
- Added a narrow `polymorphPotionHitMonster()` helper:
  - checks magic resistance before potion-class resistance;
  - uses attack level 6 for potion resistance;
  - applies 1-in-25 system shock only to ordinary non-shapechangers, killing without a corpse drop;
  - otherwise chooses a random eligible monster form and updates the monster in place;
  - transfers HP proportionally to the new maximum and keeps position, inventory, tame/peaceful identity, and wake/anger tail behavior;
  - drops an invalid worn saddle after a successful body polymorph when the new form cannot wear one.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- direct hero-thrown polymorph potion polymorphs an ordinary visible monster and consumes the potion without floor placement;
- magic resistance blocks the polymorph before a potion resistance roll;
- potion-class monster resistance blocks the polymorph after the common hit path;
- system shock can kill an ordinary non-shapechanger without leaving a floor corpse;
- polymorph potion hitting a worn saddle only wets the saddle and skips monster polymorph.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='polymorph potion|potionhit|acid potion can be blocked' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- This is a narrow `newcham()` subset. Full C parity still needs controlled/newcham target selection for chameleons, sandestins, doppelgangers, vampires, shopkeepers, guards, priests, quest leaders, long-worm tails, genocided/extinct forms, birth-limited immunity, stealth/light/stuck/swallow updates, and full monster-equipment breakage.
- Direct potion saddle interception is now covered for water, oil, and polymorph. C's generic saddle chance still applies to every supported potion identity.
- Wielded-potion bash delivery, exact non-`kn` `trycall()` prompting, and full vapor discovery ordering remain separate potion delivery work.
