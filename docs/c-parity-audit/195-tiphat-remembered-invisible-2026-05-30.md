# Tiphat Remembered Invisible Target

Date: 2026-05-30

## C Source

- `tiphat()` prompts with `At whom? (in what direction)` and spends a physical action after a valid direction: `nethack-c/upstream/src/sounds.c:1451`.
- The scan walks the ray, checks `glyph_is_invisible(glyph)`, and stops on remembered invisible targets before ordinary no-effect fallback: `nethack-c/upstream/src/sounds.c:1468`, `nethack-c/upstream/src/sounds.c:1483`.
- Remembered invisible targets produce `That unseen creature is ignoring you!`: `nethack-c/upstream/src/sounds.c:1495`.

## JS Gap

- JS `tipHatDirectedResponse()` scanned only real monsters and terrain blockers.
- A remembered invisible square with no current monster fell through to `Nothing happens.`

## Implemented

- Added a remembered-invisible check using `loc.map_invisible` during the `tiphat()` ray scan.
- The branch returns `That unseen creature is ignoring you!` while preserving the existing doff message and one spent move.

## Tests

- Added `worn helmet tip recognizes remembered invisible target`.

## Remaining Gaps

- This does not cover steed `domonnoise()`, adjacent unseen responsive monsters, hallucinated/statue behavior, or the broader nonhumanoid sound table. Visible object/furniture mimic scan filtering is covered separately in audit 246.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'worn .*helmet tip|worn soft hat tip' test/shop-billing-helpers.test.mjs`
