# Monster Launcher Intervening Lethal Cleanup

Date: 2026-06-05

## Summary

Monster-fired launcher arrows that kill an intervening monster now run the local `mondied()`-shaped cleanup path instead of leaving a zero-HP monster for the next scheduler sweep. Lethal intervening hits now print C-shaped killed/destroyed wording, record a non-hero vanquish, drop monster inventory and possible corpse/glob before deferred projectile drop/mulch, remove the monster, and refresh the map square without awarding hero experience.

The covered behavior is state-driven and does not depend on replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned shortcuts.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:673` through `:686`: monster projectiles scan intervening monsters square-by-square and route hits through `ohitmon(mtmp, singleobj, range, TRUE)`.
- `nethack-c/upstream/src/mthrowu.c:451` through `:464`: `ohitmon()` subtracts damage, prints `"%s is %s!"`, chooses `destroyed` for `nonliving(mtmp->data) || is_vampshifter(mtmp) || !canspotmon(mtmp)`, and calls `mondied()` while `svc.context.mon_moving` is set.
- `nethack-c/upstream/include/mondata.h:217` through `:220`: `nonliving()` includes undead, manes, golems, and vortices.
- `nethack-c/upstream/src/mon.c:3078` through `:3175`: `mondead()` zeroes HP, handles life-saving/reversion, updates monster death stats, and detaches the monster.
- `nethack-c/upstream/src/mon.c:2777` through `:2779`: `m_detach()` drops monster inventory through `relobj(mtmp, 1, FALSE)`.
- `nethack-c/upstream/src/mon.c:3251` through `:3262`: `mondied()` calls `mondead()`, then may create a corpse on accessible or pool squares.
- `nethack-c/upstream/src/mthrowu.c:451` through `:494`: `ohitmon()` performs death cleanup before `drop_throw(otmp, 1, ...)`, so projectile landing/mulch happens after the monster has been removed.

## JS Changes

- `js/allmain.js`
  - Adds `monsterProjectileDeathIsDestroyed()` for the C killed/destroyed predicate, including unseen targets as destroyed.
  - Adds `killMonsterFromLauncherInterveningHit()` for the monster-fired launcher intervening-hit death path.
  - Calls the cleanup branch after launcher-arrow intervening damage reaches zero, before deferred arrow landing/mulch scheduling.
  - Keeps hero experience attribution off by recording the vanquish with `awardExperience = false`.
- `test/shop-billing-helpers.test.mjs`
  - Adds visible living intervening-target coverage for `The goblin is killed!`.
  - Adds visible nonliving intervening-target coverage for `The iron golem is destroyed!`.
  - Pins target removal, dead/zero-HP state, non-hero attribution, shooter inventory cleanup, and absence of leaked transient projectiles.

## Tests

- `production monster launcher arrow kills visible intervening monster without hero attribution`
- `production monster launcher arrow destroys visible nonliving intervening monster without hero attribution`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "monster launcher arrow (kills visible|destroys visible|can hit intervening|silver launcher arrow intervening)" test/shop-billing-helpers.test.mjs` - 3 pass
- `node --test --test-name-pattern "silver launcher arrow (intervening|unseen)" test/shop-billing-helpers.test.mjs` - 5 pass
- `node --test test/shop-billing-helpers.test.mjs` - 1678 pass
- `node --test test/*.mjs` - 1829 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Launcher-arrow intervening passive-object ordering is covered in audit 780; intervening monster blinding, egg, acid-venom, mimic-reveal, and other side effects remain separate source-backed slices.
- Monster-vs-monster aimed shooter-level and artifact-launcher bonuses remain separate from hero-directed launcher shots.
- Vampire-shifter revival and broader `mondead()` special cases remain separate from this narrow launcher-arrow intervening cleanup.
