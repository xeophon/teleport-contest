# C Parity Audit 809: Cursed Confused Genocide Role Summons

Resolved the audit 808 uncertainty around cursed confused genocide. C does not self-genocide for a cursed scroll read while confused. It passes the `PLAYER` flag without `REALLY`, skips the prompt, then falls through to the cursed creation branch using the hero's non-polymorphed role monster. JS already followed that branch ordering; this slice adds regression coverage so the behavior is not changed into self-genocide later.

## Source Anchors

- `nethack-c/upstream/src/read.c:1721` through `:1734`: non-blessed genocide dispatch calls `do_genocide((!scursed) | (2 * !!Confusion))`.
- `nethack-c/upstream/src/read.c:2822` through `:2828`: `REALLY`, `PLAYER`, and `ONTHRONE` flags are defined; cursed plus confused passes only `PLAYER`.
- `nethack-c/upstream/src/read.c:2838` through `:2842`: `PLAYER` selects `u.umonster`, the non-polymorphed player monster, and skips the text prompt path.
- `nethack-c/upstream/src/read.c:2955`: the actual genocide and self-death block is gated by `how & REALLY`, so `do_genocide(PLAYER)` does not wipe out the hero's role.
- `nethack-c/upstream/src/read.c:2995` through `:3013`: the cursed branch attempts `rn1(3, 4)` explicit creations and prints either `Sent in ...` or `Nothing happens.`
- `nethack-c/upstream/src/u_init.c:991`: `u.umonster` initializes from the role monster.

## JS Changes

- `test/shop-billing-helpers.test.mjs`
  - Added a cursed confused genocide regression using an explicit Wizard role.
  - The test asserts there is no genocide prompt, no wipeout, no death state, no death cause, and no genocide list entry.
  - The test asserts the immediate cursed creation result names wizard-role monsters and consumes a move.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "cursed confused genocide" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "confused genocide|cursed confused genocide" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Genocide cleanup for existing shifted monsters is still simplified; C can force a shapechanger into another form when only its current form is genocided, while JS generally deletes matching current/base names.
- Broader terminal genocide endgame disclosure remains shared with JS's generic death UI.
- Exhaustive class-genocide immunity/non-genocidable messaging remains separate from the current genocide scroll coverage.
