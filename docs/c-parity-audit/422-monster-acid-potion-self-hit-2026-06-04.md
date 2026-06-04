# Monster Acid Potion Self-Hit

Date: 2026-06-04

## Summary

Uncaught monster-thrown potions of acid now follow the C self-target `potionhit()` acid branch after the generic catch gate fails. The split thrown potion still crashes on the hero's head and is consumed, but the deferred potion effect now applies acid burn damage unless the hero has acid resistance, then runs the acid vapor tail.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/muse.c:1522` through `:1547`: offensive monster-thrown potion candidates include acid.
- `nethack-c/upstream/src/mthrowu.c:687` through `:700`: when monster-thrown flight reaches the hero, C runs unicorn/generic catch first, then calls `potionhit(&gy.youmonst, singleobj, POTHIT_MONST_THROW)` for uncaught potions.
- `nethack-c/upstream/include/obj.h:475` through `:478`: `POTHIT_MONST_THROW` is distinct from hero throws and scatter propulsion.
- `nethack-c/upstream/src/potion.c:1633` through `:1641`: self-hit potion crashes on the hero's head and applies `rnd(2)` thrown-potion damage.
- `nethack-c/upstream/src/potion.c:1679` through `:1681`: non-oil self-hit potions visibly evaporate.
- `nethack-c/upstream/src/potion.c:1694` through `:1704`: potion of acid burns the hero for BUC-dependent damage unless acid-resistant.
- `nethack-c/upstream/src/potion.c:1906` through `:1911`: distance-zero self-hits run the `potionbreathe()` vapor tail.
- `nethack-c/upstream/src/potion.c:1927`: `potionhit()` frees the thrown potion.

## JS Changes

- `js/cmd.js`
  - Extends the existing `_potion_breathe_after_more` monster-thrown potion handler with an acid-only direct self-hit branch.
  - Reuses `heroAcidPotionSelfHitMessages()` for C-shaped resistance, BUC wording, and `d(1,8)`/`d(2,8)`/`d(1,4)` damage.
  - Runs `potionBreathe()` for acid after the burn branch so acid vapor still exercises constitution and consumes the C-shaped `rn2(2)` tail.
  - Keeps the existing crash `--More--` split and non-acid monster-thrown potion behavior intact.
- `test/shop-billing-helpers.test.mjs`
  - Adds deterministic failed-catch production tests through the existing fumbling catch gate.
  - Covers ordinary acid burn damage, acid-resistance suppression of burn damage, split-stack residual retention, no floor landing, and the final `rnd(2)`, acid-damage, vapor RNG ordering.

## Tests

- `production monster acid potion failed catch burns after crash`
- `production monster acid potion failed catch respects acid resistance`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "production monster acid potion failed catch" test/shop-billing-helpers.test.mjs` - 2 pass, 1641 skipped
- `node --test --test-reporter=spec --test-name-pattern "production monster potion|production monster acid potion failed catch" test/shop-billing-helpers.test.mjs` - 5 pass, 1638 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1643 pass
- `node --test test/*.test.mjs` - 1794 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Other monster-thrown potion self-hit families beyond the existing sleeping approximation and this acid branch remain separate C-backed slices.
- Monster-thrown potion interception by intervening monsters remains separate; C routes that through `ohitmon()`/`potionhit(mtmp, ..., POTHIT_OTHER_THROW)` before the hero-square branch.
- Broader death/engraving/shop-discovery fallout for monster-thrown potion hits remains separate unless a future audit selects those rows directly.
