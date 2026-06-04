# Monster Knife Iron Bars

Date: 2026-06-04

## Summary

Monster-thrown ordinary knives now follow the C iron-bars handling in the covered production branch. Unlike daggers, `KNIFE` is a `P_KNIFE` weapon, so `hits_bars()` lets it pass through bars unless the caller forces a hit. A non-adjacent bars check still consumes the current-square `rn2(5)` first; when that roll forces contact with the next-square bars, the knife consumes the break-test `rn2(100)`, lands on the thrower-side square with `ohit=false`, and emits `Clonk!` unless the hero is Deaf. If the force-hit gate does not fire, the knife continues through the bars and can hit or miss the hero normally.

This slice intentionally covers ordinary `KNIFE` selection only. `STILETTO`, `SCALPEL`, `WORM_TOOTH`, and `CRYSKNIFE` are knife-family objects, but they are not part of the normal monster ranged `select_rwep()` table.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/weapon.c:498` through `:502`: the monster ranged-weapon table includes `KNIFE`.
- `nethack-c/upstream/src/weapon.c:612` through `:665`: `select_rwep()` chooses exact ranged objects from that table when the needed propellor is available.
- `nethack-c/upstream/src/mthrowu.c:1191` and `:1261`: `thrwmu()` selects a ranged weapon and routes it through `monshoot()`.
- `nethack-c/upstream/src/mthrowu.c:571` through `:577`: monster missiles are launched by `m_throw()`.
- `nethack-c/upstream/include/objects.h:218` through `:220`: ordinary `knife` is an iron `P_KNIFE` weapon.
- `nethack-c/upstream/src/mthrowu.c:552` through `:566` and `:639`: point-blank bars preflight calls `hits_bars(..., always_hit=0)` and skips the random force-hit roll.
- `nethack-c/upstream/src/mthrowu.c:798` through `:799`: non-adjacent flight consumes `forcehit = !rn2(5)` before the next-square terrain check.
- `nethack-c/upstream/src/mthrowu.c:1512` through `:1520`: `hits_bars()` excludes `P_KNIFE` from the weapon-class hard stop unless `always_hit` is already true.
- `nethack-c/upstream/src/mthrowu.c:1447` through `:1467`: non-silver, non-gold, non-flimsy bar hits use `Clonk!` unless Deaf.
- `nethack-c/upstream/src/mthrowu.c:801` through `:816`: stopped missiles drop on `gb.bhitpos`, the square before the bars, with `ohit=0`.
- `nethack-c/upstream/src/mthrowu.c:742`, `:787`, and `:789`: hero hits use the hit result when dropping on the hero square, distinct from terrain stops.

## JS Changes

- `js/allmain.js`
  - Adds ordinary `KNIFE` to the covered production monster-ranged selection gate.
  - Removes a singleton knife from monster inventory before flight and clears `mon.missile` when that singleton was selected.
  - Models the non-adjacent `P_KNIFE` bars gate by consuming the current-square `rn2(5)` before each next-square bars check.
  - On forced bars contact, consumes `rn2(100)`, suppresses `Clonk!` while Deaf, lands the knife on the thrower-side square, and omits `ohit` so hit-only mulch/passive-object paths do not run.
  - Preserves the existing visible-thrower More prompt/resume behavior and normal hero catch/hit/miss landing behavior when the knife passes through bars.
- `test/shop-billing-helpers.test.mjs`
  - Adds an ordinary monster knife fixture with controlled terrain, Deaf state, and pre-key topline capture.
  - Adds pass-through, forced-Clonk, and Deaf-silent production regressions for ordinary knives and iron bars.

## Tests

- `production monster knife aimed shot can pass through iron bars before hero`
- `production monster knife aimed shot can clonk iron bars before hero`
- `production monster knife aimed iron bars are silent when deaf`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "knife.*iron bars|crude dagger.*iron bars|plain dagger.*iron bars|monster crude dagger|monster plain dagger|sling rock|kobold dart aimed" test/shop-billing-helpers.test.mjs` - 18 pass, 1552 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1570 pass
- `bash frozen/score.sh sessions/seed0030-ten-diverse-deaths.session.json` - 1/1 passing, RNG 105529/105529, Screen 1953/1953
- `node --test test/*.test.mjs` - 1714 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Adjacent point-blank knife bars are C-audited as pass-through because `P_KNIFE` is excluded from the class hard stop and the preflight uses `always_hit=0`, but a stable JS production canary remains blocked by the current `clearPath`/lineup setup.
- Other knife-family objects (`STILETTO`, `SCALPEL`, `WORM_TOOTH`, `CRYSKNIFE`) remain out of scope for ordinary monster ranged selection unless a separate source-backed path into `m_throw()` is added.
- Broader `hits_bars()` object-class coverage remains open for harmless missiles, flimsy objects, boulders/heavy iron balls, armor/tool/food/rock gates, object breakage side effects, wakeup noise, and bar dissolution.
