# C Parity Audit 247: Tiphat Hallucinated Statues

## Sources

- `nethack-c/upstream/src/sounds.c:1465-1481`: directed `tiphat()` ray scanning computes `vismon`, `unseen`, and `statue` for each square. Actual floor statues count as `statue` when there is no visible monster and no remembered invisible glyph.
- `nethack-c/upstream/src/sounds.c:1485-1492`: the scan stops on visible monsters, remembered invisible glyphs, hallucinated statues, adjacent responsive unseen monsters, or blocked terrain.
- `nethack-c/upstream/src/sounds.c:1495-1497`: remembered invisible targets and hallucinated statues share `That %screature is ignoring you!`, with the `unseen ` prefix only for the invisible-glyph case.

## JS Changes

- Added floor-statue tracking inside `tipHatDirectedResponse()` scan state.
- When the hero is hallucinating, an actual floor statue stops directed `#tip` scanning and returns `That creature is ignoring you!`.
- When the hero is not hallucinating, an actual floor statue no longer acts as a response target and the scan continues to later visible targets when the terrain remains accessible.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `hallucinating worn helmet tip treats floor statue as ignoring creature`
- `nonhallucinating worn helmet tip scans past floor statue`

## Remaining Gaps

- Steed `domonnoise()`, adjacent unseen responsive monsters, and the broader nonhumanoid sound table remain incomplete.
- C also treats statue glyphs from hallucination/mimics as `statue`; this slice covers the current JS actual-floor-statue representation because statue glyph rendering is not fully modeled.
- Furniture mimic generation and forced-chest wake-preservation follow-ups remain separate from this command scan behavior.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip (recognizes remembered invisible target|skips visible object mimic while scanning|skips visible furniture mimic and falls through|treats floor statue|scans past floor statue|makes a peaceful humanoid without helm wave)|hallucinating worn helmet tip treats floor statue|nonhallucinating worn helmet tip scans past floor statue" test/shop-billing-helpers.test.mjs` (`6` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1175/1175` tests passed)
- `node --test test/*.mjs` (`1272/1272` tests passed)
- `npm run score` (`44/44` replay sessions passed)
