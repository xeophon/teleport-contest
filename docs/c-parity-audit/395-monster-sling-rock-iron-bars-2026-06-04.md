# Monster Sling Rock Iron Bars

Date: 2026-06-04

## Summary

Monster-slung ordinary rocks now follow C iron-bars flight ordering for the covered production path. A NetHack `ROCK` is `GEM_CLASS`, not `ROCK_CLASS`, so it passes iron bars normally and only stops when the post-square `rn2(5)` forced-hit roll catches bars in the next square. Forced bar contact consumes the C break-test `rn2(100)`, lands the surviving rock before the bars with `ohit=false`, and emits `Clonk!` unless the hero is Deaf.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/makemon.c:372`: hobbits can receive a `SLING` plus `ROCK` or `FLINT` ammunition.
- `nethack-c/upstream/src/weapon.c:498` and `:630`: monster ranged selection includes `ROCK`/`FLINT`/gray stones, and `-P_SLING` ammo selects a carried `P_SLING` launcher.
- `nethack-c/upstream/include/obj.h:238`: `is_ammo()` includes `GEM_CLASS` objects with negative launcher skills, so ordinary rocks are sling ammo.
- `nethack-c/upstream/include/objects.h:1515` through `:1525` and `:1606`: the `ROCK(...)` macro emits `GEM_CLASS`, `-P_SLING`, and mineral material for ordinary rocks; boulders are separate `ROCK_CLASS` objects.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300` and `:1172`: `thrwmu()` routes monster sling attacks through `monshoot()` into `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:552` through `:568` and `:639`: preflight checks adjacent bars with `always_hit=0`, so ordinary adjacent rocks pass because there is no force roll yet.
- `nethack-c/upstream/src/mthrowu.c:673` through `:798`: `m_throw()` moves square by square, handles monster/hero hits first, then rolls `forcehit = !rn2(5)` and checks the next square.
- `nethack-c/upstream/src/mthrowu.c:1497` through `:1558`: `hits_bars()` has no `GEM_CLASS` case, so ordinary rocks only hit bars when `always_hit` is true.
- `nethack-c/upstream/src/mthrowu.c:1430` through `:1470`, `nethack-c/upstream/src/dothrow.c:2581`, and `nethack-c/upstream/src/zap.c:1458`: forced bar hits call `breaks()`/`breaktest()`, consume `obj_resists()` RNG, leave ordinary rocks intact, and choose fallback `Clonk!` unless Deaf.
- `nethack-c/upstream/src/mthrowu.c:801` and `:161`: surviving stopped objects drop at `gb.bhitpos` with `ohit=0`, so hit mulch/passive-object effects do not run.

## JS Changes

- `js/allmain.js`
  - Replaces the sling-rock branch's flat per-step `rn2(5)` consumption with a C-shaped per-square force-hit loop.
  - Checks the next square for iron bars only after the force-hit roll, so ordinary rocks pass through bars on non-forced rolls.
  - On forced bar contact, consumes `rn2(100)`, suppresses sound while Deaf, lands the rock on the square before the bars, and skips hero hit/miss plus `ohit` mulch work.
- `test/shop-billing-helpers.test.mjs`
  - Extends the production sling-rock fixture with controlled seed, terrain, thrower distance, Deaf state, and pre-key topline capture.
  - Adds pass-through, forced `Clonk!`, and Deaf-silent forced-stop regressions for monster-slung rocks.

## Tests

- `production monster sling rock hit threads ohit into drop-throw mulch check`
- `production monster sling rock miss keeps ohit false and skips mulch check`
- `production monster sling rock aimed shot can pass through iron bars before hero`
- `production monster sling rock aimed shot can clonk iron bars before hero`
- `production monster sling rock aimed iron bars are silent when deaf`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "sling rock" test/shop-billing-helpers.test.mjs` - 5 pass, 1556 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1561 pass
- `bash frozen/score.sh sessions/seed0030-ten-diverse-deaths.session.json` - 1/1 passing, RNG 105529/105529, Screen 1953/1953
- `node --test test/*.test.mjs` - 1705 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broader `hits_bars()` object-class coverage remains open for non-dart/non-arrow/non-rock monster-thrown objects, including dagger/knife distinctions, harmless missiles, flimsy objects, boulders/heavy iron balls, armor/tool/food gates, object breakage side effects, wakeup noise, and bar dissolution.
- Adjacent point-blank ordinary-rock bars behavior follows the same production loop but remains a useful future canary because C's preflight explicitly skips the force roll there.
- Monster-thrown miss continuation after the hero square still remains outside this focused rock/bar slice.
