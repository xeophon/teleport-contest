# Monster-Turn Projectile Resume Removal

Date: 2026-06-05

## Summary

Monster-turn resume now accounts for projectile kills that remove an earlier entry from the reversed monster-turn snapshot before a `--More--` pause. When a monster-thrown projectile kills an intervening monster before the current thrower in snapshot order, JS records the removed snapshot slot and adjusts the next resume start so the following monster still receives its turn. This is source-backed scheduler behavior and does not depend on replay maps, seeds, player names, or hidden-test-conditioned state.

## C Source Anchors

- `nethack-c/upstream/src/allmain.c:210` runs `movemon()` while `svc.context.mon_moving` is true.
- `nethack-c/upstream/src/mon.c:1330` and `src/mon.c:1340` drive monster movement through `iter_mons_safe()` and only purge dead monsters after the movement pass.
- `nethack-c/upstream/src/mon.c:4492` and `src/mon.c:4512` snapshot `fmon` into an iterator array before calling each monster once.
- `nethack-c/upstream/src/mon.c:1241` and `src/mon.c:1245` skip snapshot entries that are already dead or off-map before movement.
- `nethack-c/upstream/src/mthrowu.c:679` routes monster-thrown intervening projectile hits through `ohitmon()`.
- `nethack-c/upstream/src/mthrowu.c:451` and `:459` call `mondied()` rather than hero-attributed `xkilled()` for lethal monster-movement projectile hits.
- `nethack-c/upstream/src/mon.c:2494`, `:2748`, and `:3173` defer list detachment/freeing until after death cleanup, preserving safe iteration semantics.

## JS Changes

- Added `noteMonsterResumeRemoval()` and `adjustedMonsterResumeIndexForRecordedRemovals()` in `js/allmain.js`.
- Applied recorded removal adjustment when `processMonsterTurns()` initializes its resumed `startIndex`.
- Recorded removals from lethal non-potion intervening hits in `killMonsterFromThrownInterveningHit()`.
- Replaced the potion-interception live-list index comparison with the same snapshot-removal recording, so potion kills and non-potion kills use one scheduler-facing resume rule.

## Coverage

- Extended `runMonsterPlainDaggerIronBars()` with a `monsterOrder` callback so a test can place a tail monster after the current thrower in C snapshot order.
- Added `production monster thrown intervening kill resumes following snapshot monster`, which verifies that a projectile kill before the thrower does not skip the following monster after resume.
- Focused subset run:
  - `node --test --test-name-pattern "plain dagger lethal|intervening kill resumes|monster thrown non-potion|acid potion kills|launcher arrow kills" test/shop-billing-helpers.test.mjs`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "production monster thrown intervening kill resumes following snapshot monster" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "plain dagger lethal|intervening kill resumes|monster thrown non-potion|acid potion kills|launcher arrow kills" test/shop-billing-helpers.test.mjs` - 6 pass, 1691 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1697 pass
- `node --test test/*.mjs` - 1848 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The scheduler still deserves broader safe-iteration consolidation around newly created monsters and full `dmonsfree()` timing.
- Broader direct object-hit and monster lifecycle factoring should stay narrow and source-backed.
