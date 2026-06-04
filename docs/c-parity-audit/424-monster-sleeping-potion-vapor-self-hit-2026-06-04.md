# Monster Sleeping Potion Vapor Self-Hit

Date: 2026-06-04

## Summary

Uncaught monster-thrown potions of sleeping now run through the shared C-shaped distance-zero `potionbreathe()` tail after the bottle crashes on the hero and evaporates. This removes the prior special after-more branch that keyed only on potion index and skipped free action and sleep resistance, while preserving the deferred sleeping turn's adjacent positive-exercise RNG consumption and avoiding JS slow-hunger sleep state for C's `nomul()`-only vapor sleep.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/muse.c:1522` through `:1547`: monster offensive potion candidates include sleeping.
- `nethack-c/upstream/src/mthrowu.c:531` through `:550`: generic hero catch gates can fail before catch RNG, including fumbling.
- `nethack-c/upstream/src/mthrowu.c:687` through `:700`: after generic catch fail, monster-thrown potions call `potionhit(&gy.youmonst, singleobj, POTHIT_MONST_THROW)`.
- `nethack-c/upstream/src/potion.c:1623` through `:1641`: self-hit potions crash on the hero's head and apply `rnd(2)` thrown-potion damage.
- `nethack-c/upstream/src/potion.c:1680` through `:1705`: visible non-oil potions evaporate before their vapor effect.
- `nethack-c/upstream/src/potion.c:1906` through `:1927`: distance-zero self-hits run `potionbreathe()`.
- `nethack-c/upstream/src/potion.c:2052` through `:2061`: sleeping vapor sets known effect, says `You feel rather tired.`, calls `nomul(-rnd(5))`, sets the move-again wake message, and exercises Dexterity unless free action or sleep resistance makes the hero yawn instead; it does not set `Unaware`.
- `nethack-c/upstream/src/eat.c:3163` through `:3191`: slow metabolic hunger uses `Unaware`; the monster-thrown vapor sleep path should not trigger that extra `rn2(10)` gate.
- `nethack-c/upstream/src/allmain.c:239` through `:355`: helpless deferred turns continue through monster movement, new-turn work, hunger, and `exerchk()`.
- `nethack-c/upstream/src/attrib.c:488` through `:518`: negative physical exercise consumes `rn2(2)`; positive exercise consumes `rn2(19)`.

## JS Changes

- `js/cmd.js`
  - Adds ignored return metadata to `potionBreathe()` for the sampled sleeping-vapor duration.
  - Routes deferred monster-thrown failed-catch sleeping vapor through `potionBreathe()` alongside confusion, paralysis, and blindness.
  - Preserves deferred `_pending_time_passed` scheduling from the sampled sleep duration.
  - Restores the preexisting `_sleeping_time` value after deferred monster sleeping vapor so JS does not model C's `nomul()` sleep as `Unaware` for hunger.
  - Removes the hardcoded `potion.potionIndex === 17` branch while preserving the deferred sleeping turn's positive-exercise `rn2(19)` alignment after the shared negative Dex exercise.
- `test/shop-billing-helpers.test.mjs`
  - Adds `POT_SLEEPING`.
  - Adds production monster-turn failed-catch coverage for unresisted sleeping vapor.
  - Adds production coverage for unresisted vapor setting helpless time without slow-hunger sleeping time.
  - Adds production coverage for free action and sleep resistance yielding `You yawn.` without helplessness, sleeping time, sleep duration RNG, or exercise RNG.

## Tests

- `production monster sleeping potion failed catch applies vapor after crash`
- `production monster sleeping potion failed catch respects hero sleep defenses`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "production monster sleeping potion failed catch|production monster (acid|confusion|paralysis|blindness) potion failed catch" test/shop-billing-helpers.test.mjs` - 7 pass, 1641 skipped
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` - RNG 105529/105529, Screen 1953/1953
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` - 1648 pass
- `node --test test/*.test.mjs` - 1799 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Other monster-thrown potion families outside the currently modeled offensive-selection set remain separate if future production paths select them.
- Monster-thrown potion interception by intervening monsters remains separate; C routes that through `ohitmon()`/`potionhit(mtmp, ..., POTHIT_OTHER_THROW)` before the hero-square branch.
