# Monster Plain Dagger Iron Bars

Date: 2026-06-04

## Summary

Monster-thrown plain daggers now follow C iron-bars handling in the covered production branch. Unlike darts and ordinary sling rocks, a plain dagger is a `WEAPON_CLASS` object with `oc_skill == P_DAGGER`, so `hits_bars()` stops it by class instead of requiring the small-object force-hit roll to succeed. Non-adjacent bars still consume the normal post-square `rn2(5)` before the bar check; a stopped dagger then consumes the C break-test `rn2(100)`, lands on the square before the bars with `ohit=false`, and emits `Clonk!` unless the hero is Deaf.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:1172` through `:1261`: `thrwmu()` selects a monster ranged weapon and routes it through `monshoot()`.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: `monshoot()` calls `m_throw()` for the selected missile.
- `nethack-c/upstream/src/mthrowu.c:552` through `:568` and `:639`: the initial `MT_FLIGHTCHECK(TRUE, 0)` checks adjacent bars before the missile advances; daggers hit there by class while knives pass without a force roll.
- `nethack-c/upstream/src/mthrowu.c:673` through `:798`: in ordinary flight, `m_throw()` advances to the current square, handles monster/hero hits, consumes `forcehit = !rn2(5)`, then checks the next square for bars.
- `nethack-c/upstream/src/mthrowu.c:1497` through `:1558`: `hits_bars()` excludes bows/crossbows/darts/shuriken/spears/knives but explicitly not daggers, so `P_DAGGER` weapons hit bars regardless of `always_hit`.
- `nethack-c/upstream/include/objects.h:200` through `:206`: plain, silver, elven, and orcish daggers are `P_DAGGER`; knives/stilettos/scalpels are `P_KNIFE`.
- `nethack-c/upstream/src/mthrowu.c:1430` through `:1470`, `nethack-c/upstream/src/dothrow.c:2582`, and `nethack-c/upstream/src/zap.c:1457`: forced/class bar hits call `breaks()`/`breaktest()`, consume `obj_resists()` RNG, leave ordinary daggers intact, and choose fallback `Clonk!` unless Deaf.
- `nethack-c/upstream/src/mthrowu.c:801` and `:815`: surviving stopped objects drop at `gb.bhitpos`, the thrower-side square before the bars.
- `nethack-c/upstream/src/mthrowu.c:162` through `:188`: `drop_throw(..., ohit=0)` skips hit-mulch, egg-hit breakage, and `passive_obj()` effects.

## JS Changes

- `js/allmain.js`
  - Adds live-terrain iron-bars handling to the production plain-dagger throw branch.
  - Preserves the C non-adjacent ordering by consuming the post-square `rn2(5)` before checking the next square.
  - Handles adjacent-bar preflight in the branch by stopping on the monster launch square without the force-roll gate when that production path is reached.
  - On bar contact, consumes `rn2(100)`, suppresses `Clonk!` while Deaf, lands the dagger on the thrower-side square, and omits `ohit` so hit mulch/passive-object paths do not run.
  - Clears `mon.missile` when the singleton thrown dagger is removed from inventory.
- `test/shop-billing-helpers.test.mjs`
  - Adds a plain-dagger production fixture with controlled terrain, Deaf state, and pre-key topline capture.
  - Adds visible-sound and Deaf-silent regressions for the non-adjacent production dagger/bar path.

## Tests

- `production monster plain dagger aimed shot clonks iron bars before hero`
- `production monster plain dagger aimed iron bars are silent when deaf`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "plain dagger.*iron bars|monster plain dagger|monster crude dagger catch|sling rock|kobold dart aimed" test/shop-billing-helpers.test.mjs` - 11 pass, 1552 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1563 pass
- `bash frozen/score.sh sessions/seed0030-ten-diverse-deaths.session.json` - 1/1 passing, RNG 105529/105529, Screen 1953/1953
- `node --test test/*.test.mjs` - 1707 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Orcish/crude daggers should share the `P_DAGGER` class-hit behavior but still have their separate production branch with pet and visible-projectile handling.
- Knife-family projectiles should remain pass-unless-forced, unlike daggers.
- Adjacent point-blank dagger bars are implemented in the branch, but a stable end-to-end production canary still needs the surrounding monster scheduler/lineup setup to reach that branch without movement changing the launch square.
- Broader `hits_bars()` object-class coverage remains open for silver `Clink!`, harmless missiles, flimsy objects, boulders/heavy iron balls, armor/tool/food gates, object breakage side effects, wakeup noise, and bar dissolution.
