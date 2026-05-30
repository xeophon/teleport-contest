# C Parity Audit 246: Tiphat Apparent Mimics

## Sources

- `nethack-c/upstream/src/sounds.c:1451-1462`: `tiphat()` prompts for a direction, spends the physical doff action after a valid direction, and handles self/vertical targets before ray scanning.
- `nethack-c/upstream/src/sounds.c:1465-1492`: the ray scan computes `vismon`, `unseen`, and statue state each square. If a visible monster has `M_AP_FURNITURE` or `M_AP_OBJECT`, C clears `vismon` and `mtmp` before deciding whether to stop.
- `nethack-c/upstream/src/sounds.c:1495-1536`: after scanning, C reports remembered invisible/statue hallucination, responsive monster reactions, adjacent monster noise, or the shared `nothing_happens` fallback.

## JS Changes

- Split tiphat visibility into a raw "can be seen" check and the final visible-target check.
- Added apparent mimic filtering for `M_AP_FURNITURE`, `M_AP_OBJECT`, and the current JS `appearObj`/`appearGlyph` object-mimic representation.
- During directed `#tip` ray scanning, visible apparent object/furniture mimics are ignored as targets, so the scan can continue to a real target behind them or fall through to `Nothing happens.`
- The branch does not reveal the mimic, clear its appearance fields, or clear its wait strategy.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip skips visible object mimic while scanning`
- `worn helmet tip skips visible furniture mimic and falls through`

## Remaining Gaps

- Steed `domonnoise()`, adjacent unseen responsive monsters, and the broader nonhumanoid sound table remain incomplete.
- Hallucinated actual floor-statue scan behavior is covered separately in `docs/c-parity-audit/247-tiphat-hallucinated-statues-2026-05-31.md`.
- Furniture mimic generation is still only partially modeled; the canary covers the directed `tiphat()` filter for existing `m_ap_type` state.
- Forced-chest mimic wake-preservation follow-ups remain separate from this command scan behavior.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip (recognizes remembered invisible target|skips visible object mimic while scanning|skips visible furniture mimic and falls through|makes a peaceful humanoid without helm wave)" test/shop-billing-helpers.test.mjs` (`4` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1173/1173` tests passed)
- `node --test test/*.mjs` (`1270/1270` tests passed)
- `npm run score` (`44/44` replay sessions passed)
