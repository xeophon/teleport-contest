# C Parity Audit 852: Direct Sleeping Potion Grip Release

Closed a direct potion-hit gap for `POT_SLEEPING`. C runs `slept_monst()` immediately after a successful sleeping potion hit, which relaxes a non-swallowed grabber's grip on the hero. JS now mirrors that side effect after `sleepMonsterFromPotion()` succeeds, while preserving the swallowed-engulfer exception.

## Source Anchors

- `nethack-c/upstream/src/potion.c:1802` through `:1806`: `POT_SLEEPING` calls `sleep_monst()`, prints the sleep message, then calls `slept_monst(mon)`.
- `nethack-c/upstream/src/mhitm.c:1223` through `:1244`: `sleep_monst()` applies potion-class monster sleep and clears eating state.
- `nethack-c/upstream/src/mhitm.c:1248` through `:1254`: `slept_monst()` relaxes `u.ustuck` when the sleeping monster is holding the hero, the hero is not sticky, and `u.uswallow` is false.
- `nethack-c/upstream/src/potion.c:1906` through `:1918`: vapor handling follows the monster effect, so grip release precedes any adjacent direct vapor result.

## JS Changes

- `js/cmd.js`
  - Added `heroStuckMonsterMatches()` so stuck-monster identity matching is shared with the existing swallowed-projectile helper.
  - Added `sleptMonsterFromPotion()` for the C `slept_monst()` grip-release side effect.
  - Calls that helper immediately after a successful direct sleeping-potion hit, before the later anger and vapor tail.
- `test/shop-billing-helpers.test.mjs`
  - Added a command-level canary that a hero-thrown sleeping potion releases a non-swallowed stuck grabber after the sleep message.
  - Added a direct helper canary that swallowed engulfers remain stuck and do not get the grip-relax message.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "hero-thrown sleeping potion|direct hero-thrown sleeping potion|adjacent hero-thrown sleeping potion" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still has only a minimal sticky-form predicate for this path; future monster metadata work can expand it if sticky polyself forms are modeled explicitly.
- This closes direct hero-thrown potion hits; monster-thrown and other sleep sources should keep their own C-ordering canaries as those paths are audited.
