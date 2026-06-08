# C Parity Audit 803: Deferred Projectile Lifesaving Death State

Closed the deferred projectile follow-up from audits 801 and 802. When a lethal monster-fired arrow or monster-thrown dart is deferred behind a hit `--More--` prompt and amulet life saving succeeds, JS now clears the death metadata before returning to normal play, matching C's successful `done()` survival branch.

## Source Anchors

- `nethack-c/upstream/src/hack.c:4279` through `:4288`: fatal HP loss records `svk.killer.format` and `svk.killer.name`, prints `You die...`, and calls `done(DIED)`.
- `nethack-c/upstream/src/end.c:1069` through `:1079`: `done()` increments `u.umortality` and forces HP to zero before the life-saving branch.
- `nethack-c/upstream/src/end.c:1081` through `:1102`: life saving prints the medallion messages, consumes the amulet, applies the Constitution loss, calls `savelife()`, and logs the averted death while the killer state is still populated.
- `nethack-c/upstream/src/end.c:1119` through `:1124`: on survival, C clears `svk.killer.name`, resets `svk.killer.format` to `KILLED_BY_AN`, and returns without entering `really_done()`.
- `nethack-c/upstream/src/mthrowu.c:118` through `:153`: monster-thrown hero `thitu()` can return after `losehp()` when life saving averts the death, so the projectile tail continues after `done()` returns.

## JS Changes

- `js/cmd.js`
  - Added `clearLifeSavedDeathState()` for the C-equivalent immediate death metadata reset: `_death_cause`, `_death_bones_body`, `_death_current_move`, `_death_status_hp_before_zero`, `_death_taker`, and `_death_moves`.
  - Reused that helper for the existing stoning life-saving cleanup path.
  - The deferred lethal projectile amulet branch now clears death metadata only when the promoted attack payload opts in, after the life-saving continuation runs and before `lifeSavingMore` returns control to the player.
- `js/allmain.js`
  - Monster-fired launcher-arrow lethal payloads now set `clearDeathMetadataAfterLifeSaving: true`.
  - Monster-thrown dart lethal payloads now set the same flag, including the poisoned dart life-saving continuation from audit 802.
- `test/shop-billing-helpers.test.mjs`
  - The visible lethal dart life-saving and poisoned lethal dart life-saving canaries now assert that death metadata is already clear while the `You die... But wait...` prompt is active and remains clear after the prompt is dismissed.

## Tests

- `production visible lethal kobold dart life saving resumes normal landing`
- `production visible poisoned lethal kobold dart life saving limits poison to strength loss`
- Existing launcher-arrow final-death and projectile canaries still cover the non-life-saving death cause path.

## Verification

- `node --check js/cmd.js` - pass
- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "production visible .*lethal kobold dart life saving" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "life saving|lifesaving|life-saving" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "production .*kobold .*dart|production monster lethal launcher arrow" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Generic `lifeSavingMore` cleanup remains intentionally narrow. Existing non-projectile prompt-stage tests preserve `_death_cause`, so broadening this must be done as a separate source-backed slice.
- The launcher-arrow amulet path opts into the shared deferred projectile cleanup but still lacks a dedicated life-saving canary; the dart tests exercise the shared amulet branch and final-death launcher-arrow tests keep the non-life-saving cause path covered.
- The shared `_lethal_arrow_after_topline_more` name still reflects its launcher-arrow origin and can be renamed later as a mechanical cleanup.
