# Launcher Arrow Miss End-Range Forcehit

Date: 2026-06-04

## Summary

Monster-fired launcher arrows that reach the hero and miss now consume the C flight loop's final `forcehit = !rn2(5)` roll before landing through the existing deferred `drop_throw(..., ohit=false)` path. Hit cases do not consume this final roll because C drops and breaks out immediately on `hitu`.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:264` and `:300`: `monshoot()` passes the target distance as `range` into `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:720` through `:742`: ordinary monster-thrown missiles compute damage and call `thitu()` when they reach the hero.
- `nethack-c/upstream/src/mthrowu.c:106` and `:116`: `thitu()` consumes `rnd(20)` and returns `0` on a miss.
- `nethack-c/upstream/src/mthrowu.c:787` through `:795`: hit cases call `drop_throw(singleobj, hitu, u.ux, u.uy)` and break before the later flight check.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: miss cases continue to `forcehit = !rn2(5)`, then end-of-range calls `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:162` through `:175`: `drop_throw()` only runs missile mulch when `ohit` is true.

## JS changes

- `js/allmain.js`
  - Adds the final end-of-range `rn2(5)` on launcher-arrow misses before deferring shared `drop_throw(..., ohit=false)` landing.
  - Leaves hit, catch, misfire, stacked legacy landing, and lethal-arrow behavior unchanged.
- `test/shop-billing-helpers.test.mjs`
  - Adds `assertLauncherMissEndOfRangeRng()` and pins the final `rn2(5)` immediately after the miss `rnd(20)` in representative launcher-arrow miss tests.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` - 37 pass, 1502 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1539 pass
- `node --test test/*.mjs` - 1682 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Iron-bars, sink, and broader `MT_FLIGHTCHECK` obstacle flight remain separate.
- Stacked blessed enchanted launcher-arrow landing remains separate.
- Lethal launcher-arrow persistence remains separate.
