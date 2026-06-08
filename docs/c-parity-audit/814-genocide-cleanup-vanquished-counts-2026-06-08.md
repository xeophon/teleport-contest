# C Parity Audit 814: Genocide Cleanup Vanquished Counts

Closed the next genocide cleanup `mondead()` bookkeeping gap left by audit 813. C increments `mvitals[].died` when genocide cleanup actually removes a monster through `mondead()`, and that same field feeds `#vanquished` and final vanquished disclosure. JS now records genocide-cleanup removals through `recordVanquished(mon, false)` after life-saving failure and true-form restoration, so the death list is updated without awarding player XP.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries use synthetic non-shop floor state, scrolls of genocide, ordinary shifted doppelganger/vampire fixtures, and worn monster amulets where life-saving ordering matters.

## Source Anchors

- `nethack-c/upstream/src/mon.c:5656` through `:5667`: `kill_genocided_monsters()` calls `mondead()` only for true removals; apparent-form-genocided shapechangers with non-genocided bases use `newcham()` instead and are not counted dead.
- `nethack-c/upstream/src/mon.c:3091` through `:3097`: monster life-saving and vampire-rise handling return before the died count, so survivors are not recorded as vanquished.
- `nethack-c/upstream/src/mon.c:3112` through `:3118`: shifted monsters are restored to true form before death bookkeeping.
- `nethack-c/upstream/src/mon.c:3134` through `:3136`: `mondead()` increments `svm.mvitals[mndx].died` using the restored `mtmp->data`.
- `nethack-c/upstream/src/mon.c:3498`, `:3503`, and `:3671`: conduct, kill messaging, and player XP live in `xkilled()`, which genocide cleanup bypasses by calling `mondead()` directly.
- `nethack-c/upstream/src/insight.c:2767` through `:2870` and `nethack-c/upstream/src/end.c:607`: `mvitals[].died` is the vanquished counter used for in-game and final disclosure.

## JS Changes

- `js/cmd.js:31167`
  - Genocide cleanup now calls `recordVanquished(mon, false)` after failed or absent monster life saving and after true-form restoration, but before inventory drop/removal.
  - Successful monster life saving and apparent-form reshaping still skip death recording, matching C's early-return and `newcham()` paths.

## Tests

- `test/shop-billing-helpers.test.mjs:13664`
  - Added a helper that pre-marks the genocide scroll for object-score purposes and captures reward XP, so canaries distinguish monster XP from scroll discovery XP.
- `test/shop-billing-helpers.test.mjs:13676`
  - Apparent-form genocided doppelganger reshaping remains uncounted and does not award reward XP.
- `test/shop-billing-helpers.test.mjs:13702`
  - Base-genocided shifted doppelganger removal records `doppelganger`, not visible `goblin`, and does not award reward XP.
- `test/shop-billing-helpers.test.mjs:13731`
  - Base-genocided shifted doppelganger that survives through monster life saving records no death.
- `test/shop-billing-helpers.test.mjs:13769`
  - Failed life-saving on an already-genocided shifted goblin records restored `doppelganger`, not `goblin`.
- `test/shop-billing-helpers.test.mjs:13807`
  - Current-form genocided goblin with failed life-saving records `goblin` without reward XP.
- `test/shop-billing-helpers.test.mjs:13847`
  - Apparent-form genocided shifted vampire reshaping remains uncounted.
- `test/shop-billing-helpers.test.mjs:13872`
  - Base-genocided shifted vampire removal records `vampire`, not visible `vampire bat`.
- `test/shop-billing-helpers.test.mjs:13901`
  - Failed life-saving on an already-genocided vampire bat records restored `vampire`, not `vampire bat`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide cleanup removes shifted monster|genocide cleanup lets shifted base|genocide cleanup restores shifted true form|genocide cleanup consumes monster life saving before current-form removal|genocide cleanup removes shifted vampire|genocide cleanup restores shifted vampire true form|genocide cleanup reshapes shifted" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide cleanup|life saving|monster life saving|class genocide cleanup|class-genociding shifted vampire|genociding visible shifted vampire|genociding shifted vampire" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Genocide cleanup still does not mirror every `mondead()` side effect: Kop/vault guard and special monster hooks, steam vortex gas clouds, quest leader and mail daemon bookkeeping, complete light-source cleanup with pre-death data, and livelog/achievement details remain broader follow-ups.
- Exact C died-count saturation at 255 is not modeled by JS `_vanquished_counts`.
- Exhaustive non-genocidable and class-genocide immunity messaging remains separate from this removal-path bookkeeping slice.
