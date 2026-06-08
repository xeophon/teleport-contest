# C Parity Audit 801: Monster-Thrown Dart Hero Lifesaving Landing

Closed the next production dart hero-delivery follow-up after audit 800. When a monster-thrown dart's physical hit would kill the hero but amulet life saving returns from `done()`, JS now resumes the returned `thitu()` tail: Strength exercise happens and the dart uses normal hit landing/drop/mulch instead of final-death cleanup.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:702`: C snapshots `oldumort = u.umortality` before hero-hit object handling.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: ordinary monster-thrown object hero hits compute `dmgval()`, apply `Maybe_Half_Phys()` for non-acid missiles, and call `thitu(hitv, dam, &singleobj, NULL)`.
- `nethack-c/upstream/src/mthrowu.c:118` through `:153`: `thitu()` prints hit text, calls `losehp()`, then exercises Strength and returns `1` if the hit path returns.
- `nethack-c/upstream/src/hack.c:4279` through `:4288`: fatal `losehp()` sets the killer, prints `You die...`, and calls `done(DIED)`.
- `nethack-c/upstream/src/end.c:1069` through `:1119`: `done()` increments `u.umortality`; with life saving it consumes the amulet, calls `savelife()`, clears final-death state, and returns.
- `nethack-c/upstream/src/end.c:716`: `savelife()` restores hero HP before control returns to the caller.
- `nethack-c/upstream/src/mthrowu.c:745` through `:753`: poisoned darts run poison after `thitu()`, with fatality limited to `0` if life saving increased `u.umortality`.
- `nethack-c/upstream/src/mthrowu.c:786` through `:789`: after the post-hit tails, a successful hit reaches `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/mthrowu.c:170` through `:190` and `nethack-c/upstream/src/dothrow.c:1976`: `drop_throw()` handles dart hit breakage/mulch and otherwise places/stacks the projectile on the hero square.
- `nethack-c/upstream/src/end.c:1154`: `done_object_cleanup()` is only in the non-surviving `really_done()` path, so it does not own the life-saving dart case.

## JS Changes

- `js/allmain.js`
  - Added a `lifeSavingContinuation` payload to lethal physical dart hero hits.
  - The payload records the normal post-life-saving `thitu()` continuation: Strength exercise plus monster-thrown hit landing at the hero square.
- `js/cmd.js`
  - Added `continueLethalAttackAfterLifeSaving()` for deferred lethal projectile payloads.
  - The generic deferred lethal life-saving branch now consumes the amulet, runs the continuation tail, then shows the life-saving `--More--` message.
  - Final death still uses death cleanup; only the amulet-surviving branch resumes normal projectile landing.
- `test/shop-billing-helpers.test.mjs`
  - Extended `runMonsterDartHitLanding()` with optional `heroInventory`.
  - Added a visible lethal dart life-saving regression that verifies amulet consumption, `rn2(19)` life-saving, Strength exercise, normal dart hit landing/mulch RNG, no death-cleanup marker, and HP restoration after the life-saving prompt.

## Tests

- `production visible lethal kobold dart life saving resumes normal landing`
- Existing visible/unseen lethal dart final-death cleanup tests.
- Existing production kobold dart hit, poison, catch, miss, terrain, `thitu()`, and intervening canaries.

## Verification

- `node --check js/cmd.js` - pass
- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "production visible lethal kobold dart|production unseen lethal kobold dart" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "production .*kobold .*dart" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Poisoned lethal dart plus life-saving continuation still needs a separate source-backed slice for the `(u.umortality > oldumort) ? 0 : 10` poison fatality gate in the monster-thrown path.
- Generic deferred life-saving death-cause clearing remains broader hero-death work; existing covered JS life-saving cases still preserve death-cause state in several paths.
- The shared `_lethal_arrow_after_topline_more` name still reflects its launcher-arrow origin; renaming it can be a later mechanical cleanup.
- Hard-wall ordinary dart stops remain limited by the production dart `clearShot` selection gate from audit 797.
