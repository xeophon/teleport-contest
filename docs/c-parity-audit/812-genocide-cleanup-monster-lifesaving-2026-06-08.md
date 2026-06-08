# C Parity Audit 812: Genocide Cleanup Monster Life Saving

Closed the audit 811 removal-path gap where genocide cleanup deleted matching live monsters without giving worn monster amulets of life saving a chance to operate. C calls `mondead()` for the removal path, and `mondead()` runs monster life-saving before true-form restoration, death bookkeeping, detachment, and inventory drop. JS now attempts monster life-saving before genocide cleanup removal and only drops the remaining inventory if the monster is still dead.

## Source Anchors

- `nethack-c/upstream/src/mon.c:2825` through `:2836`: only a worn amulet of life saving from `which_armor(mon, W_AMUL)` can save a monster.
- `nethack-c/upstream/src/mon.c:2849` through `:2863`: visible monster life-saving prints the medallion glow/crumble messages and consumes the amulet with `m_useup()`.
- `nethack-c/upstream/src/mon.c:2867` through `:2878`: if the current monster species is genocided, life-saving restores HP, then prints the still-genocided line and sets HP back to zero.
- `nethack-c/upstream/src/mon.c:3091` through `:3094`: `mondead()` calls `lifesaved_monster()` and returns immediately if the monster survived.
- `nethack-c/upstream/src/mon.c:3112` through `:3118`: true-form restoration for cham monsters happens after the life-saving early return, so a base-genocided shifted monster can survive in its current form.
- `nethack-c/upstream/src/mon.c:3175` and `nethack-c/upstream/src/steal.c:892`: failed life-saving continues to detach/drop the remaining inventory while the consumed amulet is not dropped.

## JS Changes

- `js/cmd.js:22793`
  - Added options to the existing monster life-saving helper so genocide cleanup can suppress unseen combat-only `Maybe not...` feedback and pass active-level visibility explicitly.
- `js/cmd.js:31139`
  - Genocide cleanup removal now marks the monster dead, attempts monster life-saving, and keeps the monster on the level if life-saving succeeds.
  - If life-saving fails because the current form is genocided, the amulet has already been consumed; cleanup then drops the remaining inventory and removes the monster.

## Tests

- `test/shop-billing-helpers.test.mjs:13707`
  - Base-genocided shifted doppelganger in non-genocided goblin form consumes a worn life-saving amulet, stays on the level as a goblin, keeps non-amulet inventory, and does not print `still genocided`.
- `test/shop-billing-helpers.test.mjs:13742`
  - Current-form genocided goblin consumes a worn life-saving amulet, prints the medallion and still-genocided messages, then is removed with the remaining inventory dropped and the amulet not dropped.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide cleanup.*life saving|genocide cleanup removes shifted monster|genocide cleanup consumes monster life saving|genocide cleanup lets shifted base" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide cleanup|life saving|monster life saving|class genocide cleanup|class-genociding shifted vampire|genociding visible shifted vampire|genociding shifted vampire" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The removal path still does not perform every `mondead()` side effect, including true-form restoration before failed-life-saving death bookkeeping and other special monster detach hooks.
- Exhaustive non-genocidable/class-genocide immunity messaging remains separate from this monster life-saving cleanup slice.
