# C Parity Audit 811: Class Genocide Cleanup Order

Closed the audit 810 message-order gap for blessed class genocide. C processes each species in the selected class by marking that species genocided, cleaning up live monsters and eggs, then printing that species' `Wiped out all ...` line. Ordinary single-species genocide keeps the opposite order: print wipeout first, then clean up existing monsters. JS now preserves that split.

## Source Anchors

- `nethack-c/upstream/src/read.c:1734`: blessed scrolls take the class genocide path.
- `nethack-c/upstream/src/read.c:2748` through `:2751`: class genocide marks each species, calls `kill_genocided_monsters()`, runs `update_inventory()`, then prints `Wiped out all ...`.
- `nethack-c/upstream/src/mon.c:5656` through `:5667`: `kill_genocided_monsters()` emits individual `newcham()` messages for surviving shapechangers before returning to the class wipeout line.
- `nethack-c/upstream/src/mon.c:5669` through `:5673`: egg cleanup is part of the class cleanup path before the class wipeout line.
- `nethack-c/upstream/src/read.c:2965` and `:2993`: ordinary single-species genocide prints the wipeout line before cleanup.

## JS Changes

- `js/cmd.js:31280`
  - Split `genocideMonsterType()` ordering by `classMode`.
  - Class genocide now runs egg cleanup and `killGenocidedMonsters(messages)` before appending the species wipeout message.
  - Non-class genocide keeps the existing wipeout-before-cleanup order.
- `test/shop-billing-helpers.test.mjs:13664`
  - Added a named single-species order assertion: `Wiped out all goblins.` precedes the visible shifted-monster `turns into` cleanup message.
- `test/shop-billing-helpers.test.mjs:13749`
  - Added a blessed class-genocide counterpart using the `goblin` name-to-class fallback, asserting the visible shifted-monster `turns into` message precedes `Wiped out all goblins.`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "class genocide cleanup|genocide cleanup reshapes shifted monster|class-genociding shifted vampire" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide cleanup|class genocide cleanup|class-genociding shifted vampire|genociding visible shifted vampire|genociding shifted vampire|cursed confused genocide|confused genocide" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The base-genocided monster removal path still uses simplified JS removal, so fine-grained `mondead()` details such as monster life-saving remain broader cleanup work.
- Exhaustive non-genocidable/class-genocide immunity messaging remains separate from this class-order slice.
