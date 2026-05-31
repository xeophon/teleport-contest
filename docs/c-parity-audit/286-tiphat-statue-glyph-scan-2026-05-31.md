# C Parity Audit 286: Tiphat Statue Glyph Scan

## Sources

- `nethack-c/upstream/src/sounds.c:1475-1481`: directed `tiphat()` scans `glyph_at(x,y)`, sets `unseen` from `glyph_is_invisible(glyph)`, and sets `statue` either from `glyph_is_statue(glyph)` or from a visible top-floor `STATUE` object when there is no visible monster and no invisible glyph.
- `nethack-c/upstream/src/sounds.c:1479-1484`: C computes statue-glyph state before clearing visible object/furniture mimics from `vismon` and `mtmp`, so a visible mimic posing as a statue can still count as `statue`.
- `nethack-c/upstream/src/sounds.c:1485-1496`: statue scan state only stops the ray under `Hallucination`, then uses `That creature is ignoring you!`; nonhallucinating scans pass through statue glyphs.
- `nethack-c/upstream/include/display.h:821-836`: `glyph_is_statue()` is a glyph-identity range check for male/female statue glyphs, including pile-top variants. It is not equivalent to a rendered terminal character.

## JS Changes

- Added `statueGlyph` metadata to JS object glyphs for real statues and carried that metadata through `remembered_glyph` and `show_glyph_cell()`.
- Updated `tipHatDirectedResponse()` so directed `#tip` recognizes remembered/displayed statue glyph metadata and visible object/furniture mimics whose apparent object is `STATUE`.
- Kept C's nonhallucination behavior: statue glyphs only stop the scan while hallucinating.
- Tightened the actual floor-statue fallback to match C's `!vismon && !unseen` guard, so a visible ordinary monster standing on a statue object is not masked by the floor object.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `hallucinating worn helmet tip treats remembered statue glyph as ignoring creature`
- `nonhallucinating worn helmet tip scans past remembered statue glyph`
- `hallucinating worn helmet tip treats visible statue mimic glyph as ignoring creature`

## Remaining Gaps

- `tiphat()` still lacks a single shared C-shaped scan helper for all command paths that consult `glyph_at()`-style state.
- Broader `domonnoise()`/`dotalk()` table parity remains incomplete outside the focused `#tip` canaries already covered.

## Verification

- `node --check js/cmd.js`
- `node --check js/display.js`
- `node --check js/game.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "hallucinating worn helmet tip treats remembered statue glyph|nonhallucinating worn helmet tip scans past remembered statue glyph|hallucinating worn helmet tip treats visible statue mimic glyph|hallucinating worn helmet tip treats floor statue|nonhallucinating worn helmet tip scans past floor statue|worn helmet tip skips visible object mimic while scanning|worn helmet tip skips visible furniture mimic and falls through" test/shop-billing-helpers.test.mjs` (`7` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1289/1289` tests passed)
- `node --test test/*.mjs` (`1386/1386` tests passed)
- `npm run score` (`44/44` replay sessions passed)
