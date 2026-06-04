# Redirected Launcher Arrow Misfire Iron Bars

Date: 2026-06-04

## Summary

Redirected cursed/greased monster-fired launcher-arrow misfires now apply the C `hits_bars()` forced-hit rule for iron bars. Bow ammunition passes through iron bars when the per-square `forcehit = !rn2(5)` roll is false, but stops before the bars when that roll is true. A forced ordinary-arrow bar hit consumes the C break-test deletion-resistance roll and leaves the arrow on the current square with `ohit=false`, so it does not run hit-only missile mulch.

The ordinary arrow bar sound is now hearing-gated: non-deaf heroes get `Clonk!`; deaf heroes still get the same forced-hit landing and RNG but no audible message.

This is intentionally limited to redirected cursed/greased launcher-arrow misfires with ordinary arrows. Normal aimed-shot obstacle flight, non-arrow bar breakage, and silver-arrow `Clink!` wording remain separate slices.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:552` through `:568`: `MT_FLIGHTCHECK` calls `hits_bars()` for the next square; preflight uses `always_hit=0`, while post-move checks pass the current `forcehit` value.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: monster-thrown flight consumes `forcehit = !rn2(5)` before end-of-range or obstacle checks, then `drop_throw(singleobj, 0, ...)` lands stopped missiles.
- `nethack-c/upstream/src/mthrowu.c:1416` through `:1495`: `hit_bars()` performs the hard-hit break check and emits the bar contact sound only when the hero can hear it.
- `nethack-c/upstream/src/mthrowu.c:1497` through `:1558`: `hits_bars()` lets bow/crossbow/dart/shuriken/spear/knife-class missiles pass unless the caller forces the hit.
- `nethack-c/upstream/src/dothrow.c:2581` onward and `nethack-c/upstream/src/zap.c:1457` onward: ordinary object break tests call `obj_resists(obj, 1, 99)`, consuming `rn2(100)` even when ordinary arrows survive.

## JS changes

- `js/allmain.js`
  - Checks the next square for `IRONBARS` after each redirected-misfire movement step consumes `rn2(5)`.
  - Treats `!rn2(5)` as the forced bar-hit gate for ordinary arrows.
  - Burns the C break-test `rn2(100)` roll for forced bar hits while keeping ordinary arrows alive.
  - Emits `Clonk!` only when the hero is not deaf.
  - Stops the redirected misfire before the bars and lands through the existing `drop_throw(..., ohit=0)`-shaped path.
- `test/shop-billing-helpers.test.mjs`
  - Adds a pre-`nhgetch()` message capture to the launcher-arrow helper so tests can assert messages that are visible before the helper's preloaded Escape dismisses `--More--`.
  - Adds `heroDeaf` fixture state to cover the hearing-gated bar sound.
  - Adds redirected greased launcher-arrow misfire regressions for iron-bar pass-through, forced `Clonk!`, and deaf forced-hit silence.

## Tests

- `production monster greased launcher arrow redirected misfire can pass through iron bars`
- `production monster greased launcher arrow redirected misfire can clonk iron bars`
- `production monster greased launcher arrow redirected misfire iron bars are silent when deaf`

The deterministic seeds select source branches in the unit harness only. They are not production gates.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "redirected misfire .*iron bars|redirected misfire .*sink|redirected misfire stops|redirected misfire lands away" test/shop-billing-helpers.test.mjs` - 7 pass, 1542 skipped
- `node --test --test-name-pattern "launcher arrow" --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` - 47 pass, 1502 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs` - 1549 pass
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` - RNG 105529/105529, Screen 1953/1953
- `node --test --test-reporter=dot test/*.mjs`
- `node --test --test-reporter=spec test/*.mjs` - 1693 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining gaps

- Normal aimed launcher-arrow obstacle flight remains separate because ordinary terrain generally participates in the earlier line-up decision.
- Non-arrow iron-bar breakage, silver-arrow `Clink!`, and broader `hits_bars()` object-class coverage remain separate projectile slices.
