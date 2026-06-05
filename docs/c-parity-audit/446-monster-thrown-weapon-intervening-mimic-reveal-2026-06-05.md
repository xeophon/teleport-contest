# Monster Thrown Weapon Intervening Mimic Reveal

Date: 2026-06-05

## Summary

Monster-thrown spear, shuriken, plain dagger, crude/orcish dagger, knife, and dart intervening hits now reveal object/furniture mimic appearances before wakeup, hit messaging, damage application, and `drop_throw()`-style landing/stacking. Ordinary `mundetected` intervening targets remain concealed after successful hits, matching `ohitmon()` instead of the broader `wakeup()` force-fight path. The implementation is state-driven and does not depend on replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:262` through `:321`: `monshoot()` routes monster ranged weapons into `m_throw()` and `ohitmon()` for intervening monster collisions.
- `nethack-c/upstream/src/mthrowu.c:335`: `ohitmon()` treats only `M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) != M_AP_MONSTER` as a disguised mimic for projectile reveal.
- `nethack-c/upstream/src/mthrowu.c:340` through `:350`: hit/miss resolution happens before reveal; misses against object/furniture mimics suppress miss messaging and do not call `seemimic()`.
- `nethack-c/upstream/src/mthrowu.c:373` through `:382`: ordinary non-potion projectile hits compute damage first, then reveal disguised mimics with `seemimic(mtmp)`, then clear `msleeping`.
- `nethack-c/upstream/src/mthrowu.c:384` through `:398`: visible hit messaging and harmless pass-through messaging happen after mimic reveal.
- `nethack-c/upstream/src/mthrowu.c:451` through `:496`: damage/death cleanup and `drop_throw(otmp, 1, ...)` happen after mimic reveal and wakeup.
- `nethack-c/upstream/src/mthrowu.c:673` through `:686`: monster projectile flight advances square-by-square, finds intervening monsters with `m_at()`, and calls `ohitmon(mtmp, singleobj, range, TRUE)`.
- `nethack-c/upstream/src/mon.c:4409` through `:4426`: `seemimic()` clears mimic appearance state and redraws the square with `newsym()`.
- `nethack-c/upstream/src/mon.c:4333` through `:4345`: the broader `wakeup()` helper only clears `mundetected` in a separate force-fight path; `ohitmon()` itself does not unhide ordinary `mundetected` monsters.
- `nethack-c/upstream/src/weapon.c:498` through `:627`: monster ranged preference includes spears, shuriken, daggers, knives, and darts as thrown hands weapons rather than launcher shots.

## JS Changes

- `js/allmain.js`
  - Calls `revealProjectileHitMimicAppearance()` in each remaining non-potion monster-thrown intervening-hit branch: spear, shuriken, plain dagger, crude/orcish dagger, knife, and dart.
  - Places the reveal call after the branch-specific damage roll and before clearing `msleeping`, preserving the C `dmgval()`/`seemimic()`/wakeup order.
- `test/shop-billing-helpers.test.mjs`
  - Adds a table-driven visible object-mimic test across spear, shuriken, plain dagger, crude/orcish dagger, knife, and dart intervening hits.
  - Adds a table-driven ordinary hidden-target test across the same weapons to assert `mundetected` remains set while `msleeping` clears and damage lands on the intervening target.

## Tests

- `production monster thrown non-potion weapons reveal object mimic on intervening hit`
- `production monster thrown non-potion weapons leave ordinary hidden intervening target concealed`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "production monster thrown non-potion weapons" test/shop-billing-helpers.test.mjs` - 2 pass, 1686 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1688 pass
- `node --test test/*.mjs` - 1839 pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broader non-potion intervening hit side effects remain separate: blinding venom, eggs, acid venom, silver/searing variants outside the already covered launcher-arrow rows, passive-object follow-ups, and direct hero/polyself passive behavior.
- Hidden-target display/naming remains separate from the state parity here.
- `hits_bars()` object-class coverage should remain branch-specific and C-backed rather than folded into mimic reveal coverage.
