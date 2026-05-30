# C Parity Audit 249: Tiphat Adjacent Invisible Noise

## Sources

- `nethack-c/upstream/include/display.h:773`: `glyph_is_invisible(glyph)` identifies only the remembered invisible display glyph.
- `nethack-c/upstream/src/sounds.c:1475-1488`: directed `tiphat()` scans `m_at()`, computes `vismon = mtmp && canseemon(mtmp)`, checks remembered invisible glyphs, and separately stops on an adjacent responsive non-silent monster.
- `nethack-c/upstream/src/sounds.c:1495-1501`: a remembered invisible glyph reports `That unseen creature is ignoring you!` before wait-strategy clearing or monster noise.
- `nethack-c/upstream/src/sounds.c:1503`: responsive real targets clear `STRAT_WAITMASK`.
- `nethack-c/upstream/src/sounds.c:1526-1528`: adjacent non-deaf nonhumanoid responders use `domonnoise(mtmp)` and call `map_invisible(x,y)` when `vismon` is false.
- `nethack-c/upstream/src/sounds.c:1222` and `nethack-c/upstream/src/do_name.c:780,863`: `domonnoise()` prefixes animal messages with `Monnam(mtmp)`, which becomes `It` for unseen monsters.

## JS Changes

- Extended the `tiphat()` local animal-noise helper to accept the scan's visibility result.
- Kept visible responder wording as `The dog barks.` while making unseen adjacent responder wording use the C `Monnam()`-style `It barks.` subject.
- Preserved the remembered-invisible glyph branch as an early generic `That unseen creature is ignoring you!` response with no wait-strategy clearing.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes adjacent invisible dog bark and remembers invisible`
- `remembered invisible marker masks adjacent invisible dog response`

These canaries cover the C split between a real adjacent unseen responder with no remembered glyph and a remembered invisible glyph already present on the square.

## Remaining Gaps

- The helper remains `tiphat()`-local and still does not implement full shared `domonnoise()`/`#chat` behavior.
- Full tame hunger, full moon, shopkeeper, priest, quest, vampire, werecreature, Rider, Oracle, wake/aggravate, and hallucinated gecko special cases remain open.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip|remembered invisible marker" test/shop-billing-helpers.test.mjs` (`16` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1180/1180` tests passed)
- `node --test test/*.mjs` (`1277/1277` tests passed)
- `npm run score` (`44/44` replay sessions passed)
