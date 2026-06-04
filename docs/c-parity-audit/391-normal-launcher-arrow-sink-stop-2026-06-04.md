# Normal Launcher Arrow Sink Stop

Date: 2026-06-04

## Summary

Normal aimed monster-fired launcher arrows now stop on a visible sink before reaching the hero. The shot consumes the C per-square `forcehit = !rn2(5)` roll for the square it enters, prints `The arrow drops onto the sink.` when the hero can see that sink, and lands the arrow on the sink with `ohit=false`, so hero hit, damage, and hit-only mulch rolls do not run.

This is intentionally limited to the normal aimed launcher-arrow path and the first production obstacle that line-up permits naturally. Walls and closed doors are normally filtered by the monster line-up check before `m_throw()` is called, while sinks are not blocking terrain. A first-flight ordinary-obstruction guard was also added as a C-shaped safety path for stale/changed terrain after line-up, but production regressions for wall/door shots remain in the redirected-misfire coverage where the monster can actually fire.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: `monshoot()` computes launcher range, emits the visible shoot message, and calls `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:552` through `:568`: `MT_FLIGHTCHECK(FALSE, forcehit)` stops monster-thrown missiles on the current square when it is a sink.
- `nethack-c/upstream/src/mthrowu.c:639`: preflight obstruction checks happen before movement and before the per-square `rn2(5)` roll.
- `nethack-c/upstream/src/mthrowu.c:673` and `:798` through `:816`: the missile moves one square, consumes `forcehit = !rn2(5)`, checks end-of-range or terrain, and lands through `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:804` through `:807`: visible sink stops print `The arrow drops onto the sink.` with hallucinated `plops`.
- `nethack-c/upstream/src/mthrowu.c:1255` and `:1280` through `:1287`: monster line-up blocks obstructed/closed-door terrain but does not treat sinks as blockers.
- `nethack-c/upstream/src/mthrowu.c:170` through `:174`: `drop_throw()` only runs hit-only mulch when `ohit` is true.

## JS changes

- `js/allmain.js`
  - Adds a shared aimed-arrow landing helper that lands through the existing monster-thrown floor path with `ohit=false`.
  - Adds a normal aimed-shot first-flight obstruction guard matching C preflight drop ordering for stale blocked first squares.
  - Walks the aimed pre-hero flight path for sinks before creating the hero-adjacent transient projectile.
  - Burns one `rn2(5)` per traveled square through the sink, emits the visible sink message, lands the arrow on the sink, and returns before hero hit/miss/catch and mulch handling.
- `test/shop-billing-helpers.test.mjs`
  - Adds `production monster launcher arrow aimed shot drops onto visible sink before hero`.

## Tests

- `production monster launcher arrow aimed shot drops onto visible sink before hero`

The deterministic seed selects the source branch in the unit harness only. It is not a production gate.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "aimed shot drops onto visible sink|launcher arrow miss lands|redirected misfire .*sink" test/shop-billing-helpers.test.mjs` - 11 pass, 1539 skipped
- `node --test --test-reporter=spec --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` - 48 pass, 1502 skipped
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs` - 1550 pass
- `node --test --test-reporter=spec test/*.mjs` - 1694 pass
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` - RNG 105529/105529, Screen 1953/1953
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining gaps

- Normal aimed launcher-arrow iron-bars follow-up remains open.
- Broader non-arrow `MT_FLIGHTCHECK()` object-class coverage and silver-arrow bar wording remain separate projectile slices.
