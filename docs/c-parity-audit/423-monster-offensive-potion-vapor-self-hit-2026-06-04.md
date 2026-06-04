# Monster Offensive Potion Vapor Self-Hit

Date: 2026-06-04

## Summary

Uncaught monster-thrown potions of confusion, paralysis, and blindness now run the C distance-zero `potionbreathe()` tail after the bottle crashes on the hero and the potion evaporates. This completes the currently modeled non-sleeping offensive monster potion self-hit vapor set beyond acid, while leaving the existing sleeping timing branch for a separate cleanup.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/muse.c:1522` through `:1547`: monster offensive potion candidates are paralysis, blindness, confusion, sleeping, and acid.
- `nethack-c/upstream/src/muse.c:2005` through `:2023`: selected offensive potions are delivered with `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:531` through `:550`: generic hero catch gates can fail before catch RNG, including fumbling.
- `nethack-c/upstream/src/mthrowu.c:687` through `:700`: after unicorn/generic catch fail, monster-thrown potions call `potionhit(&gy.youmonst, singleobj, POTHIT_MONST_THROW)`.
- `nethack-c/upstream/include/obj.h:475` through `:478`: `POTHIT_MONST_THROW` identifies monster-thrown potion delivery.
- `nethack-c/upstream/src/potion.c:1623` through `:1641`: self-hit potions crash on the hero's head and apply `rnd(2)` thrown-potion damage.
- `nethack-c/upstream/src/potion.c:1679` through `:1705`: non-oil potions evaporate; only oil, polymorph, and acid have direct self-hit cases.
- `nethack-c/upstream/src/potion.c:1906` through `:1927`: distance-zero self-hits run `potionbreathe()` before billing/freeing the consumed potion.
- `nethack-c/upstream/src/potion.c:2027` through `:2032`: confusion/booze vapor makes the hero dizzy and consumes `rnd(5)`.
- `nethack-c/upstream/src/potion.c:2041` through `:2051`: paralysis vapor holds the hero unless free action blocks it.
- `nethack-c/upstream/src/potion.c:2071` through `:2079`: blindness vapor darkens vision and consumes `rnd(5)`.

## JS Changes

- `js/cmd.js`
  - Extends the deferred `_potion_breathe_after_more` monster-thrown potion handler to call `potionBreathe()` for confusion, paralysis, and blindness.
  - Keeps the acid direct burn plus vapor branch from audit 422.
  - Keeps the existing sleeping branch unchanged because it also manages pending elapsed-time processing.
- `test/shop-billing-helpers.test.mjs`
  - Adds production monster-turn failed-catch tests for confusion, paralysis, and blindness using the existing `runMonsterOffensivePotionCatch()` harness.
  - Forces failed catch through the real C-shaped fumbling gate rather than relying on a replay seed or a missed catch roll.
  - Adds concrete `POT_CONFUSION` and `POT_BLINDNESS` constants so the production monster AI selects the same offensive potion types as C.

## Tests

- `production monster confusion potion failed catch applies vapor after crash`
- `production monster paralysis potion failed catch applies vapor after crash`
- `production monster blindness potion failed catch applies vapor after crash`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "production monster (confusion|paralysis|blindness|acid) potion failed catch" test/shop-billing-helpers.test.mjs` - 5 pass, 1641 skipped
- `node --test --test-reporter=spec --test-name-pattern "production monster potion|production monster .*potion failed catch" test/shop-billing-helpers.test.mjs` - 8 pass, 1638 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1646 pass
- `node --test test/*.test.mjs` - 1797 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The existing monster-thrown sleeping potion failed-catch branch should be reconciled with shared `potionBreathe()` timing in a separate slice because it currently owns pending elapsed-time handling.
- Other monster-thrown potion families outside the current offensive-selection set remain separate if future production paths select them.
- Monster-thrown potion interception by intervening monsters remains separate; C routes that through `ohitmon()`/`potionhit(mtmp, ..., POTHIT_OTHER_THROW)` before the hero-square branch.
