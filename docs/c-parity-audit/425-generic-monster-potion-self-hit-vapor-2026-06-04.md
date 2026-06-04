# Generic Monster Potion Self-Hit Vapor

Date: 2026-06-04

## Summary

Monster-thrown potion self-hit cleanup now mirrors C's generic distance-zero `potionbreathe()` tail instead of whitelisting only the currently selected offensive potion vapors. Acid, polymorph, and lit-oil direct self-hit effects remain ordered before the shared vapor tail, while non-oil potions still evaporate before vapor effects.

The shared sleeping vapor path now models C's `nomul(-rnd(5))` as helpless time with the move-again wake message, but not as JS `_sleeping_time`. In C, potion sleeping vapor does not call `fall_asleep()` and does not make the hero `Unaware`, so it should not trigger slow-hunger sleep RNG.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:687` through `:700`: uncaught monster-thrown potions call `potionhit(&gy.youmonst, singleobj, POTHIT_MONST_THROW)`.
- `nethack-c/upstream/src/potion.c:1623` through `:1641`: hero potion impact sets `distance = 0`, prints the head-crash message, and applies `rnd(2)` shard damage.
- `nethack-c/upstream/src/potion.c:1679` through `:1681`: non-oil, non-saddle visible potions evaporate before effect handling.
- `nethack-c/upstream/src/potion.c:1687` through `:1705`: hero self-hit direct effects include lit oil explosion, polymorph feeling/polyself, and acid burn damage.
- `nethack-c/upstream/src/potion.c:1906` through `:1911`: distance-zero impacts always run `potionbreathe()` when hero anatomy can receive vapor.
- `nethack-c/upstream/src/potion.c:2052` through `:2061`: sleeping vapor says `You feel rather tired.`, calls `nomul(-rnd(5))`, sets the move-again wake message, and exercises Dexterity; resisted/free-action vapor says `You yawn.`.
- `nethack-c/upstream/include/youprop.h:397` through `:399`: `Unaware` requires negative `multi` plus `unconscious()` or fainting, not merely any negative `multi`.
- `nethack-c/upstream/src/timeout.c:954` through `:973`: actual sleep goes through `fall_asleep()`, sets `gm.multi_reason = "sleeping"`, and records `u.usleep`; potion vapor does not use this path.
- `nethack-c/upstream/src/eat.c:3163` through `:3191`: slow metabolic hunger is gated by `Unaware`.

## JS Changes

- `js/cmd.js`
  - Removes `_sleeping_time` mutation from the shared sleeping vapor branch.
  - Keeps returning the sampled `sleepDuration` metadata so deferred monster self-hit handling can schedule the C-shaped immobile turns.
  - Replaces the monster-thrown failed-catch vapor whitelist with the generic C-shaped self-hit tail:
    - non-oil evaporation message,
    - direct acid burn,
    - direct polymorph self-hit effect,
    - lit-oil explosion,
    - shared `potionBreathe()` for all potion families.
  - Keeps the deferred sleeping turn's adjacent positive-exercise `rn2(19)` alignment after the shared negative Dex exercise.
- `test/shop-billing-helpers.test.mjs`
  - Adds `POT_SPEED` for a deferred generic-vapor canary.
  - Adds a deferred monster self-hit speed-vapor test, proving the after-more handler is no longer limited to the five offensive potion effects.
  - Adds upward sleeping self-hit coverage that asserts helplessness without `_sleeping_time`.
  - Updates adjacent direct sleeping vapor coverage to assert the same non-`Unaware` state.

## Tests

- `deferred monster potion self-hit uses generic speed vapor tail`
- `upward hero-thrown sleeping potion self-hit uses nomul sleep without Unaware state`
- Updated `adjacent hero-thrown sleeping potion applies monster sleep before direct vapor`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "deferred monster potion self-hit uses generic speed vapor tail|upward hero-thrown sleeping potion self-hit|adjacent hero-thrown sleeping potion applies monster sleep|production monster sleeping potion failed catch" test/shop-billing-helpers.test.mjs` - 5 pass, 1645 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1650 pass
- `node --test test/*.test.mjs` - 1801 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining Gaps

- Monster-thrown potion interception by intervening monsters remains separate; C routes that through `ohitmon()` and `potionhit(mtmp, ..., POTHIT_OTHER_THROW)` before any hero-square failed-catch branch.
- Broader monster-selected item families remain bounded by `muse.c`; this slice does not make monsters choose non-offensive potions.
