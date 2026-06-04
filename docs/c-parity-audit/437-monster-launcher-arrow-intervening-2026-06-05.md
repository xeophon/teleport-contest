# Monster Launcher Arrow Intervening Hit

Date: 2026-06-05

## Summary

Monster-fired launcher arrows now check live monsters along the normal aimed flight path before resolving hero catch, hero hit, sink stops, or iron-bars force-hit handling. The new branch reuses the shared accidental-hit threshold helper, launcher projectile damage metadata, and `landMonsterThrownObject(..., { ohit: true })` so a hit can wake and damage the intervening monster, then use the existing C-shaped monster-thrown landing, mulch, passive-object, floor-effect, stacking, and shop paths.

This is a source-backed production broadening only. It does not add replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:1174` through `:1262`: `thrwmu()` selects a ranged weapon and calls `monshoot()` for hero-directed monster shots.
- `nethack-c/upstream/src/mthrowu.c:262` through `:300`: `monshoot()` computes the hero or monster target range and calls `m_throw()` for each shot.
- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: `m_throw()` advances square-by-square and resolves `m_at()` before the hero square.
- `nethack-c/upstream/src/mthrowu.c:679` through `:685`: an intervening monster calls `ohitmon()`; a true return stops projectile travel.
- `nethack-c/upstream/src/mthrowu.c:340` through `:357`: `ohitmon()` uses `5 + find_mac() + omon_adj(..., FALSE)` against `rnd(20)`; a miss continues unless this is the last range square.
- `nethack-c/upstream/src/mthrowu.c:373` through `:494`: a hit uses object damage, wakes the target, applies side effects, and drops the projectile with `ohit`.
- `nethack-c/upstream/src/mthrowu.c:798` through `:815`: end-of-range and terrain/iron-bars checks happen after current-square monster and hero handling.

## JS Changes

- `js/allmain.js`
  - Adds an intervening-monster lookup to the normal aimed launcher-arrow scan before iron-bars/sink/ordinary terrain checks.
  - Uses `monsterThrownObjectAccidentalHitValue(target, thrownMissile)` for the C `ohitmon()` hit threshold.
  - Applies launcher projectile damage to the intervening monster without hero-path elf shooter bonuses, matching C's monster-hit branch.
  - Defers surviving projectile landing through the existing `_arrow_drop_throw_after_topline_more` path with `ohit: true`.
  - Leaves redirected cursed/greased misfire scans out of this slice.
- `test/shop-billing-helpers.test.mjs`
  - Extends `runMonsterLauncherArrowLanding()` with `extraMonsters`.
  - Adds a boundary test proving a launcher arrow can hit a blocking monster before hero damage or iron-bars sound.

## Tests

- `production monster launcher arrow can hit intervening monster before hero`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster launcher arrow can hit intervening monster before hero" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster launcher arrow (hit lands|can hit intervening|catch|aimed shot|miss lands|hit can mulch|silver launcher arrow|elf launcher|plus-one launcher|plus-two launcher|eroded launcher|cursed launcher|greased launcher|blessed launcher)" test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test test/shop-billing-helpers.test.mjs` - 1668 pass
- `node --test test/*.test.mjs` - 1819 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Redirected cursed/greased launcher-arrow misfire scans still do terrain-only handling.
- Intervening monster hits still use the current minimal monster-damage branch and do not perform full `xkilled()`/`mondied()` cleanup.
- Intervening monster poison, silver, blinding, egg, acid-venom, and mimic-reveal side effects remain outside this slice.
- Monster-vs-monster aimed shooter-level and artifact-launcher bonuses remain separate from hero-directed launcher shots.
