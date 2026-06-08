# C Parity Audit 816: Vanquished Count Saturation

Closed the explicit `mvitals[].died` saturation gap left by audit 815. C stores each species death count in an unsigned-byte field and `mondead()` stops incrementing it once it reaches 255. JS now applies the same per-species cap in the shared `recordVanquished()` helper, so #vanquished and final death disclosure totals cannot grow beyond C's visible count for a heavily repeated species.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary seeds ordinary local game state and synthetic vanquished bookkeeping, then records two distinct ordinary goblins across the 254 -> 255 -> 255 boundary.

## Source Anchors

- `nethack-c/upstream/include/hack.h:680` through `:682`: `struct mvitals` stores `died` as `uchar`.
- `nethack-c/upstream/src/mon.c:3124` through `:3136`: `mondead()` documents the dual use of `mvitals[].died` and increments only when the species count is below 255.
- `nethack-c/upstream/src/insight.c:2814` through `:2820`: `list_vanquished()` sums `svm.mvitals[i].died` for the visible total.
- `nethack-c/upstream/src/insight.c:2867` through `:2870`: each visible vanquished row reads the same saturated species count.
- `nethack-c/upstream/src/insight.c:2923` through `:2927`: the final total line is printed from the saturated sum.

## JS Changes

- `js/cmd.js:42`
  - Added `VANQUISHED_COUNT_LIMIT = 255`.
- `js/cmd.js:48001`
  - `recordVanquished()` now normalizes the existing species count and stores `Math.min(255, previous + 1)`.
  - `_vanquished_total` and `_vanquished` continue to be recomputed from `game._vanquished_counts`, so the visible display follows the capped value.
  - XP and alignment handling still run for each distinct recorded monster when requested; exact C repeated-kill XP scaling remains a separate XP parity topic.

## Tests

- `test/shop-billing-helpers.test.mjs:13686`
  - Added `vanquished count saturates at C mvitals died limit`, which starts goblin deaths at 254, records two distinct goblins without XP, and asserts the species count, total, and display row remain at 255.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "vanquished count saturates|genocide cleanup creates harmless gas cloud|genocide cleanup creates steam cloud|genocide cleanup consumes monster life saving" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Exact C repeated-kill XP scaling still is not modeled because JS `monsterExperienceValue()` currently has no death-count parameter.
- Genocide cleanup still does not mirror every `mondead()` side effect: Kop/vault guard and special monster hooks, quest leader and mail daemon bookkeeping, complete light-source cleanup with pre-death data, and livelog/achievement details remain broader follow-ups.
- Exact region messages for the hero being enveloped by harmless steam remain outside this died-count slice.
- Exhaustive non-genocidable and class-genocide immunity messaging remains separate from this removal-path bookkeeping work.
