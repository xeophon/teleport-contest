# C Parity Audit 802: Monster-Thrown Poisoned Dart Hero Lifesaving

Closed the poison follow-up from audit 801. When a monster-thrown poisoned dart's physical hit would kill the hero but amulet life saving returns from `done()`, JS now resumes the C post-hit tail in order: Strength exercise, thrown-weapon poison with fatality forced to zero, then normal hit landing/drop/mulch.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:702`: C snapshots `oldumort = u.umortality` before the hero-hit object handling.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: ordinary monster-thrown darts compute physical `dmgval()`, hit value, `Maybe_Half_Phys()`, and call `thitu(hitv, dam, &singleobj, NULL)`.
- `nethack-c/upstream/src/mthrowu.c:118` through `:153`: `thitu()` prints the hit text, calls `losehp()`, then exercises Strength and returns `1` when life saving lets control return.
- `nethack-c/upstream/src/hack.c:4279` through `:4288`: fatal physical damage calls `done(DIED)`.
- `nethack-c/upstream/src/end.c:1069` through `:1119`: `done()` increments `u.umortality`; with life saving it consumes the amulet, applies the Constitution loss, calls `savelife()`, clears the killer state, and returns.
- `nethack-c/upstream/src/mthrowu.c:745` through `:753`: after returned `thitu()`, poisoned poisonable darts call `poisoned(xname(singleobj), A_STR, killer_xname(singleobj), (u.umortality > oldumort) ? 0 : 10, TRUE)`.
- `nethack-c/upstream/src/attrib.c:321` through `:393`: `fatal == 0` forces the poison path to one-point attribute loss, skipping both the deadly poison branch and thrown-weapon HP poison damage.
- `nethack-c/upstream/src/mthrowu.c:786` through `:789`: normal `drop_throw(singleobj, hitu, u.ux, u.uy)` runs after poison.
- `nethack-c/upstream/src/dothrow.c:1976`: hit-only missile mulch remains the normal post-poison landing path.

## JS Changes

- `js/allmain.js`
  - Lethal physical dart hero hits now add a conditional `lifeSavingContinuation.poison` payload when the missile is poisoned and poisonable.
  - The payload carries C's `xname()`-style reason, `killer_xname()`-style killer, and `fatal: 0`.
- `js/cmd.js`
  - `applyHeroPoisonedProjectileAfterMore()` now accepts a fatal override while preserving the existing default thrown-weapon `fatal = 10` behavior.
  - `fatal: 0` skips `rn2(30)`, severe poison, and HP poison damage, and applies only the Strength-loss branch.
  - The poison helper can return messages without appending to `_topline_after_more`, so the lifesaving continuation can fold poison messages into the existing life-saving prompt.
  - `continueLethalAttackAfterLifeSaving()` now applies the poison continuation after Strength exercise and before normal dart landing.
- `test/shop-billing-helpers.test.mjs`
  - Added a poisoned lethal dart life-saving regression covering fatal-zero poison, no deadly poison RNG, Strength loss, amulet consumption, normal landing, and no death-cleanup marker.

## Tests

- `production visible poisoned lethal kobold dart life saving limits poison to strength loss`
- Existing visible lethal dart life-saving normal landing regression.
- Existing production poisoned dart hit, resistance, miss, catch, and landing canaries.

## Verification

- `node --check js/cmd.js` - pass
- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "production visible .*lethal kobold dart life saving" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "production .*kobold .*dart" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Generic deferred life-saving still preserves death-cause state in several existing JS paths; this audit only closes the monster-thrown poisoned dart fatal-zero continuation.
- The shared `_lethal_arrow_after_topline_more` name still reflects its launcher-arrow origin and can be renamed later as a mechanical cleanup.
- Hard-wall ordinary dart stops remain limited by the production dart `clearShot` selection gate from audit 797.
