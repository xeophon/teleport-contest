# Monster Launcher Intervening Mimic Reveal

Date: 2026-06-05

## Summary

Monster-fired launcher arrows that hit an intervening object/furniture mimic now reveal the mimic before hit messaging and damage side effects. The same slice pins the C nuance that ordinary `mundetected` hiders are not unhidden by `ohitmon()`; they are hit and woken, but remain concealed. The implementation is state-driven and does not depend on replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:673` through `:686`: monster projectile flight advances square-by-square, finds intervening monsters with `m_at()`, and calls `ohitmon(mtmp, singleobj, range, TRUE)`.
- `nethack-c/upstream/src/mthrowu.c:335`: `ohitmon()` treats only `M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) != M_AP_MONSTER` as a disguised mimic for projectile reveal.
- `nethack-c/upstream/src/mthrowu.c:340` through `:350`: hit/miss resolution happens before reveal; misses against object/furniture mimics suppress miss messaging and do not call `seemimic()`.
- `nethack-c/upstream/src/mthrowu.c:373` through `:382`: non-potion projectile damage is computed first, then `seemimic(mtmp)` reveals object/furniture mimics before `msleeping = 0`, hit messaging, poison/silver/acid/egg effects, HP damage/death, and `drop_throw()`.
- `nethack-c/upstream/src/mon.c:4409` through `:4426`: `seemimic()` clears mimic appearance state and redraws the square with `newsym()`.
- `nethack-c/upstream/src/mon.c:4333` through `:4345`: the broader `wakeup()` helper only clears `mundetected` in a separate force-fight path; `ohitmon()` itself does not unhide ordinary `mundetected` monsters.

## JS Changes

- `js/allmain.js`
  - Imports `M_AP_MONSTER` for the same `M_AP_TYPE != M_AP_MONSTER` distinction used by C.
  - Adds `revealProjectileHitMimicAppearance()` to clear local mimic appearance fields and redraw the square.
  - Calls the helper in the launcher-arrow intervening-hit path after hit selection/damage roll and before sleep clearing, hit messaging, silver/poison side effects, lethal cleanup, and deferred projectile landing.
- `test/shop-billing-helpers.test.mjs`
  - Adds object-mimic coverage that asserts the projectile hits the intervening mimic, wakes it, clears `m_ap_type`/appearance fields, and preserves the existing RNG/projectile landing sequence.
  - Adds ordinary hidden-target coverage that asserts `mundetected` remains set after the hit while `msleeping` clears.

## Tests

- `production monster launcher arrow reveals object mimic on intervening hit`
- `production monster launcher arrow leaves ordinary hidden intervening target concealed`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern="launcher arrow (can hit intervening|reveals object mimic|leaves ordinary hidden|kills visible|destroys visible|silver launcher arrow intervening|poisoned launcher arrow intervening)" test/shop-billing-helpers.test.mjs` - 5 pass, 1675 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1680 pass
- `node --test test/*.mjs` - 1831 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Potion-path mimic reveal and non-launcher thrown-object mimic reveal remain separate `ohitmon()` slices.
- Intervening monster blinding, egg, acid-venom, and broader passive side effects remain separate source-backed slices.
- Monster-vs-monster aimed shooter-level and artifact-launcher bonuses remain separate from hero-directed launcher shots.
