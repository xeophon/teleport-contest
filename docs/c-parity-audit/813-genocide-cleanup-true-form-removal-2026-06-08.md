# C Parity Audit 813: Genocide Cleanup True-Form Removal

Closed the next audit 812 removal-path gap for base-genocided shifted monsters. C's genocide cleanup calls `mondead()` when the monster's true `cham` species has been genocided. If life saving does not leave the monster alive, `mondead()` silently restores the monster to its true form before death bookkeeping, detach/drop cleanup, and final removal. JS now restores the saved true form before removing a base-genocided shifted monster from genocide cleanup.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries use synthetic shifted doppelganger and vampire fixtures, visible floor state, scrolls of genocide, and ordinary worn monster amulets where life-saving ordering matters.

## Source Anchors

- `nethack-c/upstream/src/mon.c:5639` through `:5667`: `kill_genocided_monsters()` treats a genocided `mtmp->cham` true species as a removal condition and calls `mondead(mtmp)` rather than `newcham()`.
- `nethack-c/upstream/src/mon.c:3091` through `:3097`: `mondead()` runs monster life saving first, returns if the monster survived, and then lets vampire-shifter revival return early only when allowed.
- `nethack-c/upstream/src/mon.c:2899`: `vamprises()` refuses vampire-shifter revival when the base vampire species is genocided.
- `nethack-c/upstream/src/mon.c:3112` through `:3118`: after life-saving/vampire-rise early returns, `mondead()` restores `mtmp->cham` to true form with `set_mon_data()` and clears `cham`.
- `nethack-c/upstream/src/mon.c:3134` through `:3136`: death bookkeeping uses the restored `mtmp->data`, so the died count is associated with the true form rather than the temporary shifted form.
- `nethack-c/upstream/src/mon.c:3175` and `nethack-c/upstream/src/mon.c:2734`: `m_detach()` receives the saved pre-death data pointer for light-source cleanup while the live monster has already been restored.
- `nethack-c/upstream/src/mon.c:2777`: inventory drop runs after restoration and uses the live monster state.

## JS Changes

- `js/cmd.js:31118`
  - Added `restoreGenocideMonsterTrueFormForDeath()`, which resolves the saved `chamBase`, `vampBase`, `chamName`, or `cham` species, updates the monster's visible data/name/glyph fields to that base species, and clears the shift markers.
- `js/cmd.js:31166`
  - Genocide cleanup now calls the true-form restoration helper after a failed or absent monster life-saving attempt and before inventory drop/removal.
  - Successful monster life saving still returns early, preserving audit 812 parity where a base-genocided shifted monster can survive in its current non-genocided form.

## Tests

- `test/shop-billing-helpers.test.mjs:13687`
  - Base-genocided shifted doppelganger removal now asserts the removed monster object is dead, has zero HP, has been restored to `doppelganger`, and has no `chamBase` marker.
- `test/shop-billing-helpers.test.mjs:13746`
  - If the shifted goblin form was already genocided, a worn monster life-saving amulet is consumed first; the still-genocided cleanup then removes the monster after restoring it to `doppelganger`.
- `test/shop-billing-helpers.test.mjs:13837`
  - Base-genocided shifted vampire removal now asserts the removed monster object is dead, has zero HP, has been restored to `vampire`, has no `vampBase` marker, and emits no vampire-rise message.
- `test/shop-billing-helpers.test.mjs:13861`
  - If the shifted vampire bat form was already genocided, a worn monster life-saving amulet is consumed first; final cleanup removes the monster after restoring it to `vampire`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide cleanup|life saving|monster life saving|class genocide cleanup|class-genociding shifted vampire|genociding visible shifted vampire|genociding shifted vampire" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Genocide cleanup still does not mirror every `mondead()` side effect: Kop/vault guard and special monster hooks, steam vortex gas clouds, quest leader and mail daemon bookkeeping, complete light-source cleanup with pre-death data, and exact died/vanquished accounting remain broader follow-ups.
- Exhaustive non-genocidable and class-genocide immunity messaging remains separate from this removal-path true-form slice.
