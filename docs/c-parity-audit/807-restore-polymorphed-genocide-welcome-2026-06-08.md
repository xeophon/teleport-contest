# C Parity Audit 807: Restore Polymorphed Genocide Welcome

Closed the restore presentation gap left by audit 806. JS now replaces the normal saved-game welcome with the C-style doomed-polyself line when a restored hero is still polymorphed and their base role or race has already been genocided.

## Source Anchors

- `nethack-c/upstream/src/restore.c:631` through `:633`: restore only rejects a dead saved hero when base HP is nonpositive and the hero is not protected by positive polymorph HP.
- `nethack-c/upstream/src/restore.c:944` through `:949`: after a successful restore, C redraws, clears the message window, calls `welcome(FALSE)`, then continues ordinary room-entry checks.
- `nethack-c/upstream/src/allmain.c:862` through `:866`: `welcome(FALSE)` returns early for `Upolyd && ugenocided()` and prints `You're back, but you still feel %s inside.`
- `nethack-c/upstream/src/polyself.c:2265` through `:2288`: `ugenocided()` tests role/race genocide and `udeadinside()` chooses `dead`, `condemned`, or `empty` from the current form.
- `nethack-c/upstream/src/polyself.c:232` through `:246`: death remains deferred until rehumanization, after the return-form message.

## JS Changes

- `js/save.js`
  - Added `restoredPolymorphedGenocideWelcomeMessage()`.
  - The helper detects a saved polyself form plus genocided base role/race names from `_genocided_monsters`.
  - The dead-inside adjective mirrors the existing command-side categories for living, undead/nonliving, and golem/vortex forms.
- `js/jsmain.js`
  - The saved-game branch now asks the helper for a special restore message before falling back to the generic `welcome back to NetHack` line.
  - The restore path still does not kill immediately; existing rehumanization handling keeps audit 806's deferred-death behavior.

## Tests

- `restore welcome reports still dead inside for saved polymorphed base genocide`
- `restored polymorphed base genocide replaces normal welcome-back line`
- `restore welcome uses nonliving dead-inside adjectives`
- `restore welcome only changes when base hero is genocided while polymorphed`

## Verification

- `node --check js/save.js` - pass
- `node --check js/jsmain.js` - pass
- `node --check test/save-bones.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec test/save-bones.test.mjs` - pass, 6/6
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broader terminal genocide endgame disclosure remains shared with JS's generic death UI.
- Vampire-shifter-specific genocide reversion and exhaustive class-genocide ordering remain separate polyself/class-genocide slices.
