# C Parity Audit 50: Direct Thrown Paralysis Potionhit

## Purpose

This note records the implemented direct hero-thrown potion of paralysis monster-hit slice and the fresh follow-up audits. Full `potionhit()` parity is still incomplete; this only extends the existing direct thrown confusion/booze coverage by one compact monster-effect family.

## Implemented Slice

C direct potion delivery first rolls the thrown-object hit with `rnd(20)`, then gives potions a direct-hit gate with `ACURR(A_DEX) > rnd(25)`. On a hit, `potionhit()` consumes `bottlename()` RNG, prints the visible crash message, possibly chips one monster HP with `rn2(5)`, prints evaporation for visible non-oil potion hits, then applies the potion effect.

For potion of paralysis, C has no monster resistance roll. It only calls `paralyze_monst(mon, rnd(25))` when `mon->mcanmove` is true. `paralyze_monst()` sets `mcanmove` false, stores the frozen timeout, terminates eating, and clears wait-for-you strategy. After the monster effect and wake/anger handling, adjacent direct vapor can still affect the hero through `potionbreathe()`.

JS now includes paralysis in the existing direct hero-thrown potionhit path. The new branch skips `monsterResistsEffect()`, treats both `false` and numeric `0` `mcanmove` as already immobile, sets movable monsters to `mcanmove = false`, stores `mfrozen = rnd(25)`, clears local eating/waiting state, and preserves the existing crash/evaporation/direct-vapor order.

## C Anchors

- `nethack-c/upstream/src/dothrow.c:2152`: thrown-object hit roll consumes `rnd(20)`.
- `nethack-c/upstream/src/dothrow.c:2262-2264`: hero-thrown potions use the `ACURR(A_DEX) > rnd(25)` direct-hit gate and call `potionhit()`.
- `nethack-c/upstream/src/potion.c:1627`: `potionhit()` starts with `bottlename()`.
- `nethack-c/upstream/src/potion.c:1671-1681`: visible monster hits print the crash line, consume `rn2(5)` for chip damage, and print evaporation for visible non-oil/non-saddle hits.
- `nethack-c/upstream/src/potion.c:1809-1815`: potion of paralysis applies `rnd(25)` only if `mon->mcanmove` is true and has no resistance roll.
- `nethack-c/upstream/src/mhitm.c:1209-1218`: `paralyze_monst()` sets `mcanmove`, `mfrozen`, clears eating, and clears wait-for-you strategy.
- `nethack-c/upstream/src/mon.c:1200-1204`: monster frozen timeout later restores movement.
- `nethack-c/upstream/src/potion.c:1906-1911`: adjacent direct vapor is checked after the monster effect.
- `nethack-c/upstream/src/potion.c:2041-2048`: hero paralysis vapor message and `rnd(5)` helpless duration.
- `nethack-c/upstream/src/attrib.c:489-509`: paralysis vapor's dexterity exercise consumes the C `rn2(2)` loss roll.

## JS Notes

- `js/cmd.js`: `supportsHeroThrownPotionHit()` now accepts paralysis in addition to confusion and booze.
- `js/cmd.js`: direct-hit support/effect lookup uses a potion-effect helper that falls back to `potionIndex`, so appearance-only objects can still reach the covered effect families.
- `js/cmd.js`: `monsterCanMoveForPotionParalysis()` handles both JS `false` and C-shaped numeric `0` immobility.
- `js/cmd.js`: `heroThrownPotionHitMonster()` applies `paralyzeMonsterFromPotion(mon, rnd(25))` without calling `monsterResistsEffect()`.
- `test/shop-billing-helpers.test.mjs`: focused tests assert visible hit messages, inventory consumption, no floor object, no resistance RNG, adjacent direct vapor ordering, no duration extension for already immobile monsters, and numeric `mcanmove: 0` handling.

## Fresh Follow-Up Findings

### Burying Merchandise

Burying merchandise remains the smallest next shop-helper consolidation. C `bury_objs()` calls `stolen_value()` for each floor object before burial, marks buried non-gold objects `no_charge`, and emits one debt line for burying merchandise. Current JS still has a local burial pricing path, so replacing that with the shared lost-merchandise primitive is a direct source-backed cleanup.

Relevant anchors: `nethack-c/upstream/src/dig.c:2050-2079` and `nethack-c/upstream/src/shk.c:3754-3855`.

### Direct Potionhit: Sleeping

The next compact direct `potionhit()` family should be potion of sleeping. C calls `sleep_monst(mon, rnd(12), POTION_CLASS)`, prints a visible "falls asleep" line only if sleep affected the monster, and then runs `slept_monst()`. That slice needs sleep resistance and potion-resistance behavior, unlike paralysis.

Relevant anchors: `nethack-c/upstream/src/potion.c:1802-1807` and `nethack-c/upstream/src/mhitm.c:1221-1257`.

### Broader Follow-Ups

Floor polymorph and floor stone-to-flesh costly alteration remain broader shop-helper callers because they combine object replacement, same-shop dummy billing, and out-of-shop lost-merchandise debt. Remaining forced-chest details still include blade breakage during long forcing, blunt wake-nearby behavior, and material-specific non-potion shatter wording. Full direct `potionhit()` also still needs bash delivery, non-`kn` `trycall()` prompts, exact visibility/discovery handling, and the remaining potion families.

## Ranking

1. Burying merchandise helper cleanup is the next smallest shared `stolen_value()` consolidation slice.
2. Direct hero-thrown sleeping potionhit is the next compact monster-effect family.
3. Floor polymorph and floor stone-to-flesh costly alteration should follow after the floor lost-merchandise helper shape is settled.
4. Remaining direct potionhit families, bash delivery, `trycall()` details, and visibility/discovery behavior are still open.
