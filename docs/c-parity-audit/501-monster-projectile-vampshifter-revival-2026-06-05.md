# C Parity Audit 501: Monster Projectile Vampshifter Revival

Monster-thrown projectile intervening kills now route shifted vampire forms through a `vamprises()`-style revival gate before final death cleanup. The projectile hit still emits the neutral killed/destroyed line first; if the target is a shifted vampire form and its base vampire is not genocided, the same monster remains alive in base vampire form with refreshed HP and no corpse, inventory drop, vanquish count, removal, or resume-removal bookkeeping.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries use existing production projectile helpers and ordinary visible intervening targets.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:451` through `:464`: lethal `ohitmon()` projectile hits print killed/destroyed wording, using `destroyed` for `is_vampshifter()`, then call `mondied()` while the monster turn is moving.
- `nethack-c/upstream/src/mthrowu.c:673`: monster projectile flight calls `ohitmon()` for intervening monsters.
- `nethack-c/upstream/include/monst.h:217`: `is_vampshifter()` is true when the monster's base `cham` form is a vampire but its current data is shifted away from that base form.
- `nethack-c/upstream/src/mon.c:2886` through `:2940`: `vamprises()` restores movement, HP, base vampire form, and emits the visible rise message.
- `nethack-c/upstream/src/mon.c:3090` through `:3100`: `mondead()` calls `vamprises()` before sad feelings, gas clouds, detach/drop/corpse cleanup, and final removal.

## JS Changes

- `js/allmain.js`
  - Adds a projectile-specific vampshifter base resolver and revival helper next to `killMonsterFromThrownInterveningHit()`.
  - Calls the revival gate after the neutral projectile death message and before `noteMonsterResumeRemoval()`, `recordVanquished()`, inventory drop, corpse creation, and monster removal.
  - Preserves the launcher `--More--` queue path and the immediate non-launcher path by honoring the existing `afterMore` flag.

## Tests

- `production monster launcher arrow revives shifted vampire intervening kill`
  - Pins visible launcher-arrow message order: hit, destroyed, then `The seemingly dead vampire bat suddenly transforms and rises as a vampire!`.
  - Asserts base vampire state, full revived HP, cleared shift metadata, retained inventory, no corpse/drop/vanquish/removal, and no transient projectile leak.
- `production monster plain dagger revives shifted vampire intervening kill before cleanup`
  - Exercises the same shared helper through the non-launcher immediate-message path.
  - Pins the dagger landing at the intervening square while the revived vampire remains alive and carries its inventory.

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "revives shifted vampire|plain dagger revives shifted vampire" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
