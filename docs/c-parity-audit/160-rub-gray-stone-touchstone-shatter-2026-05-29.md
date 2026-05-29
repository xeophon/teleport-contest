# `#rub` Gray-Stone Routing And Cursed Touchstone Shatter

## C Anchors

- `rub_ok()` suggests oil lamps, magic lamps, brass lanterns, gray stones, and lumps of royal jelly: `nethack-c/upstream/src/apply.c:1770`.
- `dorub()` dispatches gray stones to `use_stone()` and royal jelly to `use_royal_jelly()`: `nethack-c/upstream/src/apply.c:1785`.
- `use_stone()` observes the source stone if the hero is not blind before prompting for a target: `nethack-c/upstream/src/apply.c:2690`.
- Known touchstones narrow target suggestions through `touchstone_ok()`; unknown or not fully known stones use `any_obj_ok()`: `nethack-c/upstream/src/apply.c:2658` and `nethack-c/upstream/src/apply.c:2696`.
- Cursed touchstones shatter non-gray gems before blind or hallucination fallback messages: `nethack-c/upstream/src/apply.c:2707`.
- `obj_resists(obj, 80, 100)` consumes an `rn2(100)` resistance roll and always protects artifacts for this branch: `nethack-c/upstream/src/zap.c:1458`.

## JS State Before

- `#apply` already routed gray stones through `beginUseStone()`, with prompt splitting in `js/cmd.js`.
- `#rub` only listed lamps and royal jelly, so gray stones produced "You don't have anything to rub." unless another rub candidate existed.
- `finishUseStone()` handled self-rub, blind, hallucination, and generic scritch, but did not observe the source stone or shatter cursed-touchstone targets.

## Change

- `rubObjectLetters()` and the `rubObject` menu now include every gray stone candidate, including known non-touchstone stones hidden from ordinary `#apply`.
- Selecting a gray stone through `#rub` routes to `beginUseStone()`, sharing the same secondary target mode used by `#apply`.
- Sighted `beginUseStone()` marks the source stone description known and records a non-identified `gray stone` discovery without learning the actual gray-stone type.
- `finishUseStone()` now implements the C cursed-touchstone shatter branch for non-gray gem targets, including resistance RNG, blind/hallucination/sighted wording, one-unit useup, and move cost.

## Tests

- `#rub includes unknown gray stones and observes the source when sighted`
- `#rub suggests known non-touchstone gray stones and lists them with other rub candidates`
- `blind #rub gray stone source does not observe the gray-stone appearance`
- `cursed touchstone shatters non-gray gems before the blind fallback`

## Remaining Gaps

- Full `use_stone()` effect matrix: blessed or effective touchstone gem identification, non-touchstone scratch marks, color streaks, ring material gates, cloth/liquid/wax/wood/gold/silver/flimsy material handling.
- Reusable C-shaped `getobj()` extraction remains open; `#apply`, `#rub`, and `#tip` still have local prompt/menu implementations.
- `#rub` no-hands handling should still be checked against broader command polyself rules.
