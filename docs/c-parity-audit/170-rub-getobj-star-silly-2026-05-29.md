# Rub Getobj Star Silly 2026-05-29

Implemented a compact `#rub` command-menu parity slice. No private fixtures were inspected.

## C Anchors

- `rub_ok()` suggests only oil lamps, magic lamps, brass lanterns, gray stones, and royal jelly for the first `#rub` object prompt: `nethack-c/upstream/src/apply.c:1770`.
- `dorub()` checks no-hands before calling `getobj()`, then routes gray stones to `use_stone()` and royal jelly to `use_royal_jelly()`: `nethack-c/upstream/src/apply.c:1785`.
- `getobj()` handles `?` by passing the suggested-letter set, but handles `*` with `allowed_choices = NULL`, which opens the full inventory: `nethack-c/upstream/src/invent.c:1963`.
- `display_pickinv()` only filters inventory rows when `lets` is non-null: `nethack-c/upstream/src/invent.c:3270`.
- Selecting an existing object rejected by the command callback calls `silly_thing(word, otmp)`: `nethack-c/upstream/src/invent.c:2071`. The shared wording is "That is a silly thing to %s.": `nethack-c/upstream/src/decl.c:43`.

## JS Work

- Extracted a shared `isRubObjectCandidate()` predicate for the `#rub` prompt, `?` menu, and direct selection checks.
- Added `rubObjectMenuItems(ch)` so `?` lists only suggested rub candidates while `*` lists the full carried inventory.
- Directly selecting a carried non-candidate during `#rub` now cancels the command with "That is a silly thing to rub." instead of re-prompting.
- Left no-hands ordering and gray-stone source observation unchanged.

## Public Tests

Added and tightened focused coverage in `test/shop-billing-helpers.test.mjs`:

- `#rub suggests known non-touchstone gray stones and lists them with other rub candidates` now asserts `?` excludes a dagger while `*` includes it.
- `#rub direct non-candidate selection uses C silly thing wording`

## Remaining Gaps

- Reusable `getobj()` extraction remains open; this slice only fixes the local `#rub` handler.
- Remaining `tiphat()` scan/noise reactions are still separate command/menu work.
