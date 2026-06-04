# Launcher Arrow Silver Bar Sound

Date: 2026-06-04

## Summary

Monster-fired launcher arrows that are modeled as silver arrows now use the C iron-bars impact sound. Forced hits on iron bars still consume the same per-square `rn2(5)` force-hit roll and the `rn2(100)` break-test roll, still land the surviving arrow on the square before the bars with `ohit=false`, and still suppress the impact sound while Deaf. The audible sound is now `Clink!` for silver material instead of the ordinary arrow `Clonk!`.

Single projectile shot messages also use the modeled projectile name, so a silver arrow is reported as `shoots a silver arrow!` instead of being flattened to `shoots an arrow!`.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:274` through `:291`: `monshoot()` formats single-shot messages from `singular(otmp, xname)` and uses `an(onm)`, so a silver arrow is named as a silver arrow.
- `nethack-c/upstream/src/mthrowu.c:552` through `:568`: monster-thrown flight checks call `hits_bars()` for iron bars in the next square.
- `nethack-c/upstream/src/mthrowu.c:673` through `:675` and `:798` through `:816`: ordinary flight moves first, consumes `forcehit = !rn2(5)`, checks iron bars, and lands stopped surviving missiles with `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:1447` through `:1468`: `hit_bars()` emits no impact sound while Deaf; otherwise coin-class, gold material, and silver material use the `Clink!` row, while ordinary non-flimsy arrows fall through to `Clonk!`.
- `nethack-c/upstream/src/mthrowu.c:1512` through `:1520`: bow ammunition passes through bars unless the caller forces a hit.
- `nethack-c/upstream/include/objects.h:141` through `:152`: ordinary arrows are iron bow ammunition; silver arrows are silver bow ammunition.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2593` and `nethack-c/upstream/src/zap.c:1458` through `:1471`: ordinary arrow bar-hit break tests consume `rn2(100)` through `obj_resists()` and survive.

## JS Changes

- `js/allmain.js`
  - Names single monster launcher projectiles from `singular`/`actualKind`/`kind`, preserving existing ordinary arrow wording and adding silver-arrow wording.
  - Adds an iron-bars impact sound predicate for launcher-arrow terrain stops. Coin-class, gold material, and silver material now use `Clink!`; ordinary arrows continue using `Clonk!`.
  - Reuses the predicate for both redirected misfire and normal aimed iron-bars forced-hit paths.
- `test/shop-billing-helpers.test.mjs`
  - Adds normal aimed and redirected misfire silver-arrow iron-bars regressions.
  - Uses existing `arrowOverrides` object metadata to model silver material. Seeds only select already-covered harness branches and are not production gates.

## Tests

- `production monster silver launcher arrow aimed shot can clink iron bars before hero`
- `production monster silver launcher arrow redirected misfire can clink iron bars`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "silver launcher arrow|aimed shot can clonk iron bars|redirected misfire can clonk iron bars|aimed iron bars are silent|redirected misfire iron bars are silent" test/shop-billing-helpers.test.mjs` - 6 pass, 1549 skipped
- `node --test --test-reporter=spec --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` - 53 pass, 1502 skipped
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs` - 1555 pass
- `node --test --test-reporter=spec test/*.mjs` - 1699 pass
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` - 1/1 passing, RNG 105529/105529, Screen 1953/1953
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broader `hits_bars()` object-class coverage remains open: harmless missiles, flimsy objects, boulders/heavy iron balls, armor/tool/food/rock gates, object breakage side effects, wakeup noise, and bar dissolution are separate slices.
- Multishot projectile message wording remains separate from this single-projectile launcher-arrow slice.
