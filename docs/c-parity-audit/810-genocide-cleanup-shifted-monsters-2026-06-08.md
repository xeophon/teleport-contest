# C Parity Audit 810: Genocide Cleanup Shifted Monsters

Closed the audit 809 cleanup gap for existing shifted monsters. C genocide cleanup distinguishes a monster's current shape from its underlying shapechanger form: if only the current shape is genocided, the monster changes shape and keeps its inventory; if the underlying cham/base form is genocided, the monster is removed through the death cleanup path. JS now follows that split for chameleons/doppelgangers/sandestins and vampire shifters instead of deleting both cases.

## Source Anchors

- `nethack-c/upstream/src/mon.c:5639` through `:5664`: `kill_genocided_monsters()` checks the current `data` index separately from `kill_cham`; current-form genocide calls `newcham(mtmp, NULL, NC_SHOW_MSG)`, while base/cham genocide calls `mondead(mtmp)`.
- `nethack-c/upstream/src/mon.c:4941` and `:5236`: vampire shifters use the vampire shape picker, and accepted new forms reject genocided monsters.
- `nethack-c/upstream/src/mon.c:5157`: vampire shape picking avoids wolf form on bad walking terrain and falls back to the base vampire form when the picked alternate is genocided.
- `nethack-c/upstream/src/mon.c:5460`: visible current-form cleanup uses the ordinary `turns into` shapechange message.
- `nethack-c/upstream/src/mon.c:3096` and `:3112`: `mondead()` restores true form for the base-genocided removal path and does not allow vampire-shifter revival when the base form is genocided.

## JS Changes

- `js/cmd.js:19074`
  - Polymorph target selection now rejects already-genocided monster names, matching C's `accept_newcham_form()` restriction.
- `js/cmd.js:31061`
  - Added normalized helpers for current monster names and underlying `chamBase`/`vampBase` names.
- `js/cmd.js:31072`
  - Added genocide cleanup target selection for vampire shifters, including vampire leader terrain checks and fallback away from genocided alternate forms.
- `js/cmd.js:31116`
  - Changed `killGenocidedMonsters()` so current-form genocide reshapes a shifted monster while base/cham genocide still removes it and drops inventory on the active level.
  - Saved-level cleanup now passes the saved level into vampire fallback selection so active-level terrain cannot influence off-level monsters.
- `js/cmd.js:51397`
  - Extended the shared monster polymorph helper with options to suppress map refresh and saddle-drop side effects for saved-level data cleanup.

## Tests

- `test/shop-billing-helpers.test.mjs:13664`
  - Current-form genocide reshapes a shifted doppelganger and retains inventory.
- `test/shop-billing-helpers.test.mjs:13686`
  - Base-form genocide removes the shifted doppelganger and drops inventory.
- `test/shop-billing-helpers.test.mjs:13706`
  - Current-form genocide reshapes a shifted vampire and retains inventory.
- `test/shop-billing-helpers.test.mjs:13728`
  - Base-form genocide removes the shifted vampire without a death-rise message.
- `test/shop-billing-helpers.test.mjs:13748`
  - Saved-level shifted vampire leader cleanup uses saved-level lava terrain and avoids an active-level wolf fallback.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "genocide cleanup" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide cleanup|genociding visible shifted vampire|genociding shifted vampire|class-genociding shifted vampire|cursed confused genocide|confused genocide" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- C class genocide prints the class wipeout after cleanup; JS still prints the wipeout message before cleanup for all genocide paths.
- The base-genocided monster removal path still uses a simplified JS removal, so fine-grained `mondead()` details such as monster life-saving remain broader cleanup work.
- Exhaustive non-genocidable/class-genocide immunity messaging remains separate from this shifted-monster cleanup slice.
