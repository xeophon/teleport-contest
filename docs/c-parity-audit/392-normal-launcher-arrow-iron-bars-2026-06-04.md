# Normal Launcher Arrow Iron Bars

Date: 2026-06-04

## Summary

Normal aimed monster-fired launcher arrows now apply the C iron-bars flight check before reaching the hero. Ordinary bow arrows can pass through iron bars when the post-move `forcehit = !rn2(5)` roll is false. When that roll forces a hit on bars in the next square, the arrow consumes the C break-test `rn2(100)`, prints `Clonk!` if the hero can hear, survives as an ordinary arrow, and lands on the square before the bars with `ohit=false`.

This also keeps the normal aimed sink stop in the same C-ordered pre-hero flight walk: terrain checks now consume one `rn2(5)` per traveled square before deciding whether to stop, and the later hero catch/hit/miss logic only runs when the arrow actually reaches the hero.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:1255` and `:1391` through `:1398`: monster ranged attacks use `lined_up()`/`m_lined_up()` for the hero target.
- `nethack-c/upstream/src/mthrowu.c:1348` through `:1351`, `nethack-c/upstream/src/vision.c:165`, and `nethack-c/upstream/include/rm.h:72` through `:119`: iron bars do not block line-up vision or `IS_OBSTRUCTED` terrain checks.
- `nethack-c/upstream/src/mthrowu.c:552` through `:568`: `MT_FLIGHTCHECK` calls `hits_bars()` for the next square; preflight passes `always_hit=0`, post-move checks pass `forcehit`.
- `nethack-c/upstream/src/mthrowu.c:639`: preflight bars adjacent to the shooter are checked before movement and before `rn2(5)`.
- `nethack-c/upstream/src/mthrowu.c:673` through `:675` and `:798` through `:816`: each ordinary flight step moves first, consumes `forcehit = !rn2(5)`, checks bars in the next square, then lands stopped missiles with `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:1447` through `:1468`: ordinary iron arrows hitting bars use the default audible `Clonk!` sound, suppressed while Deaf.
- `nethack-c/upstream/src/mthrowu.c:1512` through `:1520`: bow ammunition passes through bars unless the caller forces a hit.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2593` and `nethack-c/upstream/src/zap.c:1458` through `:1471`: bar-hit break tests consume `rn2(100)` through `obj_resists()`.

## JS changes

- `js/allmain.js`
  - Replaces the flat normal aimed pre-hero `rn2(5)` loop with a C-ordered flight walk.
  - Keeps ordinary preflight obstruction drops before any per-square `rn2(5)`.
  - Checks iron bars in the next square after each traveled square consumes `rn2(5)`.
  - On forced bar hits, consumes the C break-test `rn2(100)`, emits hearing-gated `Clonk!`, and lands the arrow before the bars with `ohit=false`.
  - Leaves hero catch/hit/miss resolution unchanged when bars are passed through.
- `test/shop-billing-helpers.test.mjs`
  - Adds normal aimed launcher-arrow iron-bar pass-through, forced `Clonk!`, and deaf forced-hit silence regressions.

## Tests

- `production monster launcher arrow aimed shot can pass through iron bars before hero`
- `production monster launcher arrow aimed shot can clonk iron bars before hero`
- `production monster launcher arrow aimed iron bars are silent when deaf`

The deterministic seeds select source branches in the unit harness only. They are not production gates.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "aimed shot .*iron bars|aimed iron bars|aimed shot drops onto visible sink|redirected misfire .*iron bars" test/shop-billing-helpers.test.mjs` - 7 pass, 1546 skipped
- `node --test --test-reporter=spec --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` - 51 pass, 1502 skipped
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs` - 1553 pass
- `node --test --test-reporter=spec test/*.mjs` - 1697 pass
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` - 1/1 passing, RNG 105529/105529, Screen 1953/1953
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining gaps

- Non-arrow iron-bar breakage, silver-arrow `Clink!`, and broader `hits_bars()` object-class coverage remain separate projectile slices.
- Broader normal aimed obstacle flight for stale ordinary terrain remains safety-covered but not production-regressed because walls and closed doors normally prevent the monster from choosing the shot during line-up.
