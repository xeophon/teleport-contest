# C Parity Audit 258: Tiphat Special Speakers

## Sources

- `nethack-c/upstream/src/sounds.c:705-709`: `MS_ORC` remaps to humanoid speech for hallucinating or same-race heroes before the sound switch.
- `nethack-c/upstream/src/sounds.c:987-1004`: `MS_ORC` emits `grunts.`, while `MS_DJINNI` handles tame, peaceful water demon, peaceful djinni, hostile prisoner, and hostile disturbed-djinni branches.
- `nethack-c/upstream/src/sounds.c:1129-1139`: `MS_ARREST` uses the peaceful `Just the facts, Sir/Ma'am.` branch or a hostile `rn2(3)` arrest warning table.
- `nethack-c/upstream/src/sounds.c:1173-1191`: `MS_GUARD` checks carried top-level money, and `MS_SOLDIER` uses separate peaceful and hostile `rn2(3)` tables.
- `nethack-c/upstream/src/sounds.c:1222-1241`: `pline_msg` uses `Monnam(mtmp)` and `verbl_msg` uses `verbalize1()`.
- `nethack-c/upstream/src/sounds.c:1503-1529`: directed `tiphat()` clears wait strategy, handles visible humanoids first, and only then reaches `domonnoise()` for adjacent fallback responders.

## JS Changes

- Added explicit `MS_ARREST`, `MS_GUARD`, `MS_SOLDIER`, `MS_DJINNI`, and `MS_ORC` handling in `tipHatMonsterNoise()`.
- Kept this slice explicit-sound driven instead of adding broad humanoid species fallbacks, preserving the visible humanoid response path.
- Added top-level carried-gold detection for the guard branch, matching C's `money_cnt(gi.invent)` shape.
- Reused the existing invisible responder mapping path for `pline_msg` style output such as `It grunts.` and `It gurgles.`.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes peaceful invisible Kop give arrest address`
- `worn helmet tip makes hostile invisible Kop use arrest warning table`
- `worn helmet tip makes invisible guards mention carried gold only when present`
- `worn helmet tip makes invisible soldiers use peaceful and hostile tables`
- `worn helmet tip maps invisible djinni speech variants`
- `worn helmet tip makes invisible explicit orc sound grunt`

## Remaining Gaps

- `MS_ORC` hallucination and same-race remapping into the broad humanoid speech table remains open.
- This remains `tiphat()`-local and does not replace shared `domonnoise()` or `#chat` behavior.
- Generic monster-data `msound` generation remains incomplete; these tests use explicit C sound constants to avoid broad name fallback changes.
- Hostile `MS_CUSS` and the broader humanoid speech table are still separate slices.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'worn helmet tip (makes peaceful invisible Kop|makes hostile invisible Kop|makes invisible guards|makes invisible soldiers|maps invisible djinni|makes invisible explicit orc)' test/shop-billing-helpers.test.mjs` (`6` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1216/1216` tests passed)
- `node --test test/*.mjs` (`1313/1313` tests passed)
- `npm run score` (`44/44` replay sessions passed)
