# Monster Crude Dagger Iron Bars

Date: 2026-06-04

## Summary

Monster-thrown crude/orcish daggers now follow C iron-bars handling in their covered production branch. `ORCISH_DAGGER` is an iron `P_DAGGER` weapon, so `hits_bars()` stops it by class just like a plain dagger: a non-adjacent bar check still consumes the current-square `rn2(5)` first, then the stopped dagger consumes the break-test `rn2(100)`, lands on the thrower-side square with `ohit=false`, and emits `Clonk!` unless the hero is Deaf.

The existing crude-dagger pet interception path keeps C ordering around terrain: a pet on the current flight square is handled before the next-square bars check, while a pet behind bars is never reached.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:571`: monster-thrown missiles route through `m_throw()`.
- `nethack-c/upstream/include/objects.h:206` and `nethack-c/upstream/include/skills.h:24`: crude dagger is `ORCISH_DAGGER`, material `IRON`, skill `P_DAGGER`.
- `nethack-c/upstream/src/mthrowu.c:552`, `:560`, and `:639`: the point-blank `MT_FLIGHTCHECK(TRUE, 0)` checks adjacent bars before movement and skips the random force-hit roll.
- `nethack-c/upstream/src/mthrowu.c:673` through `:679`: each flight loop advances to the current square and handles a monster there before checking terrain beyond it.
- `nethack-c/upstream/src/mthrowu.c:798`: non-adjacent bars checks consume `forcehit = !rn2(5)` before `MT_FLIGHTCHECK`.
- `nethack-c/upstream/src/mthrowu.c:1512` through `:1517`: `hits_bars()` makes `P_DAGGER` weapons hit bars regardless of the random force-hit result.
- `nethack-c/upstream/src/mthrowu.c:1430`, `nethack-c/upstream/src/dothrow.c:2582`, and `nethack-c/upstream/src/zap.c:1457`: bars handling calls `breaks()`/`breaktest()`/`obj_resists()`, consuming `rn2(100)`.
- `nethack-c/upstream/src/mthrowu.c:1453` through `:1466`: an iron crude dagger selects fallback `Clonk!` unless Deaf.
- `nethack-c/upstream/src/mthrowu.c:814`: stopped missiles drop at `gb.bhitpos`, the square before the bars.
- `nethack-c/upstream/src/mthrowu.c:161` through `:188`: `drop_throw(..., ohit=0)` skips hit mulch, egg-hit breakage, and passive-object effects.
- `nethack-c/upstream/src/mthrowu.c:494`: monster-hit drops use `ohit=1` on the monster square, which is distinct from a later bars stop.

## JS Changes

- `js/allmain.js`
  - Adds live-terrain iron-bars handling to the production crude/orcish dagger throw branch.
  - Preserves C non-adjacent ordering by checking the current flight square for an intercepting pet before consuming `rn2(5)` and checking the next square for bars.
  - Handles adjacent-bar preflight in the branch by stopping on the monster launch square without the force-roll gate when that production path is reached.
  - On bar contact, consumes `rn2(100)`, suppresses `Clonk!` while Deaf, lands the dagger on the thrower-side square, and omits `ohit` so hit mulch/passive-object paths do not run.
  - Clears `mon.missile` when the singleton thrown crude dagger is removed from inventory.
- `test/shop-billing-helpers.test.mjs`
  - Adds a crude/orcish dagger production fixture with controlled terrain, Deaf state, inert line pets, and pre-key topline capture.
  - Adds visible-sound and Deaf-silent regressions for the non-adjacent production crude-dagger/bar path.
  - Adds pet-order regressions for bars-before-pet and pet-before-bars.

## Tests

- `production monster crude dagger aimed shot clonks iron bars before hero`
- `production monster crude dagger aimed iron bars are silent when deaf`
- `production monster crude dagger iron bars stop before pet`
- `production monster crude dagger hits pet before iron bars`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "crude dagger.*iron bars|plain dagger.*iron bars|monster crude dagger|monster plain dagger|sling rock|kobold dart aimed" test/shop-billing-helpers.test.mjs` - 15 pass, 1552 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1567 pass
- `bash frozen/score.sh sessions/seed0030-ten-diverse-deaths.session.json` - 1/1 passing, RNG 105529/105529, Screen 1953/1953
- `node --test test/*.test.mjs` - 1711 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Adjacent point-blank crude-dagger bars are implemented in the branch, but a stable end-to-end production canary still needs a scheduler/lineup fixture that avoids same-square pickup changing the post-turn inventory state.
- Plain/crude dagger branches still model only the currently covered monster-intercept paths; broader arbitrary monster collision parity should be handled as a separate source-backed slice shared with plain dagger.
- Knife-family projectiles should remain pass-unless-forced, unlike daggers.
- Broader `hits_bars()` object-class coverage remains open for silver `Clink!`, harmless missiles, flimsy objects, boulders/heavy iron balls, armor/tool/food gates, object breakage side effects, wakeup noise, and bar dissolution.
