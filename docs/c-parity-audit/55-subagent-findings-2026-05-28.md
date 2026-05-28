# C Parity Audit 55: Direct Sleeping Potionhit

## Purpose

Record the direct hero-thrown potion of sleeping slice for `potionhit()` parity.

## Implemented Slice

C routes a hero-thrown potion hit through `potionhit()`: the thrown-potion hit gate consumes the attack roll, `potionhit()` picks a bottle name, prints the crash message, may chip one monster HP, prints evaporation, applies the potion effect, then runs wake/anger and adjacent vapor handling.

This slice adds potion of sleeping to JS's existing direct hero-thrown potionhit helper. The sleeping branch now consumes `rnd(12)` before resistance checks, short-circuits on monster sleep resistance, applies potion-class magic resistance at attack level 6, and only then puts movable monsters into timed sleep with `mcanmove = false` and `mfrozen` accumulation. It clears an active meal on successful sleep, leaves permanent `msleeping` clear so wake/anger does not undo the timed sleep, and emits "falls asleep" only when the monster was actually affected.

Adjacent direct vapor remains ordered after the monster sleep effect and reuses the existing hero sleeping-vapor path.

## C Anchors

- `nethack-c/upstream/src/dothrow.c:2262-2265`: hero-thrown potions that hit a monster call `potionhit(mon, obj, POTHIT_HERO_THROW)` and consume the thrown object.
- `nethack-c/upstream/src/potion.c:1625-1681`: `potionhit()` sets target coordinates, prints bottle crash, applies optional chip damage, and prints evaporation before potion-specific effects.
- `nethack-c/upstream/src/potion.c:1802-1806`: `POT_SLEEPING` calls `sleep_monst(mon, rnd(12), POTION_CLASS)`, prints the visible "falls asleep" line only on success, then calls `slept_monst(mon)`.
- `nethack-c/upstream/src/mhitm.c:1223-1247`: `sleep_monst()` checks sleep resistance, defended sleep, and class resistance before setting timed sleep on movable monsters.
- `nethack-c/upstream/src/potion.c:1897-1909`: hero-thrown hits still wake/anger through `wakeup(mon, TRUE)` and then run adjacent `potionbreathe()` if the hero is close enough.

## JS Anchors

- `js/cmd.js:12499`: `supportsHeroThrownPotionHit()` now includes `sleeping`.
- `js/cmd.js:12525`: `monsterResistsSleepEffect()` captures the local sleep-resistance fields used by current monster fixtures.
- `js/cmd.js:12536`: `sleepMonsterFromPotion()` implements the C-shaped timed sleep path and preserves the duration-before-resistance RNG order.
- `js/cmd.js:12546`: `heroThrownPotionHitMonster()` runs sleeping after crash/evaporation and before wake/anger and adjacent vapor.
- `js/cmd.js:48749`: the hero throw command now routes supported sleeping potions through the direct hit helper instead of generic projectile landing.
- `test/shop-billing-helpers.test.mjs:15728`: focused coverage for successful timed sleep, sleep resistance, potion resistance, already-immobile targets, and adjacent vapor ordering.

## Follow-Up Findings

Remaining `potionhit()` parity includes unseen `Crash!`, saddle hits, concealed mimic reveal details, shield-effect messages for resisted sleep, full `defended(AD_SLEE)` equipment modeling, `slept_monst()` stuck-grabber release, and broader potion families such as healing, sickness, blindness, speed, and invisibility. Broader shop-helper work still includes boulder push shop-boundary transitions, shared `sellobj()`, generic `obfree()` preservation, and remaining magic-bag source/target cases.

## Ranking

1. Boulder push shop-boundary transitions and shared `sellobj()`.
2. Remaining direct `potionhit()` monster-effect families from `potion.c`.
3. Generic `obfree()` and ownership consolidation.
4. Remaining magic-bag valuation/source/target cases.
5. Remaining stone-to-flesh object rows, resistance, and beam traversal.
