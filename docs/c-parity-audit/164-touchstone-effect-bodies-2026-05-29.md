# Touchstone Effect Bodies 2026-05-29

Implemented a focused `use_stone()` visible-effect slice after the existing cursed-touchstone shatter branch. No private fixtures were inspected.

## C Anchors

- `use_stone()` observes the source stone, selects a target, rejects self-rubbing, then performs cursed touchstone shatter before blind/hallucination fallbacks: `nethack-c/upstream/src/apply.c:2680`.
- Effective touchstone identification requires an actual touchstone and a gem target, then either a blessed touchstone or an uncursed touchstone used by an Archeologist or Gnome; it calls `makeknown(TOUCHSTONE)`, `makeknown(obj->otyp)`, then `prinv()`: `nethack-c/upstream/src/apply.c:2744`.
- Non-gemstone/non-mineral rings are excluded from gem/ring streak handling and fall through to material effects: `nethack-c/upstream/src/apply.c:2733`.
- Gems and eligible rings use object color streaks, glass scratches, and non-touchstone scratches: `nethack-c/upstream/src/apply.c:2752`.
- Gold material makes golden scratch marks: `nethack-c/upstream/src/apply.c:2779`.
- Ruby is a red gemstone in the object table: `nethack-c/upstream/include/objects.h:1531`.

## JS Work

- Added `useStoneEffectMessage()` in `js/cmd.js` to replace the generic sighted `"scritch, scritch"` fallback after shatter.
- Added touchstone-effective identification helpers that learn touchstone and gem discoveries without learning BUC, matching C `makeknown()` scope rather than full inventory identification.
- Reused existing ring/gem material helpers where possible, and added local use-stone color/name tables for red ruby streaks and ring appearance colors.
- Added the ring material gate so a gold ring is handled as gold material and prints golden scratch marks instead of generic scritch or ring color streaks.

## Public Tests

Added focused tests in `test/shop-billing-helpers.test.mjs`:

- Blessed touchstone identifies a carried ruby and records touchstone/ruby discoveries.
- Uncursed Archeologist touchstone identifies a carried ruby.
- Ineffective sighted touchstone leaves red streaks on a ruby without identifying it.
- Gold ring rubbed on a touchstone makes golden scratch marks.

## Fresh Subagent Findings Kept For Next Slices

- Lateral wand polymorph is still adjacent-only in JS; C `bhit()`/`bhitpile()` traverses up to range and can affect multiple piles along a ray. Also ensure pile-only helpers return true only for actual polymorph effects, not merely eligible coordinates.
- Ordinary stairs/ladders object migration still needs C-shaped per-object metadata: source level, destination level, and `MIGR_STAIRS_UP`/`MIGR_LADDER_UP` delivery mode, with reciprocal delivery on ordinary `goto_level()` arrival.
- `tiphat()` target reactions still need visible peaceful humanoid tests, cursed monster helmet BUC learning tests, hostile/conflicted humanoid RNG wording, and conflict-ring detection.
- Monster-thrown `drop_throw(obj, ohit, x, y)` still needs hit-only `should_mulch_missile()` behavior before shipping, floor effects, and stacking.

## Verification

- `node --check js/cmd.js`
- `node --test --test-name-pattern='touchstone|stone|ruby|gold ring|gray stone|#rub' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` -> `44/44 passing`
