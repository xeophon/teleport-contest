# C Parity Audit 256: Tiphat Mumble

## Sources

- `nethack-c/upstream/src/sounds.c:984-986`: `MS_MUMBLE` emits `mumbles incomprehensibly.` through the ordinary `pline_msg` path with no RNG.
- `nethack-c/upstream/src/sounds.c:1222-1241`: `pline_msg` is emitted with `Monnam(mtmp)` prepended, unseen responders are mapped before output, and `domonnoise()` returns `ECMD_TIME`.
- `nethack-c/upstream/src/sounds.c:1417-1423`: directed `tiphat()` responders must be adjacent, responsive, seeing, and not blocked by helpless/no-eyes conditions.
- `nethack-c/upstream/src/sounds.c:1503-1529`: visible humanoids are intercepted before `domonnoise()`, while adjacent non-humanoid responders reach sound handling.
- `nethack-c/upstream/include/monsters.h:1972-2030`: naga hatchlings and adult nagas use `MS_MUMBLE` and are non-humanoid `S_NAGA` monsters.

## JS Changes

- Added `tiphat()` sound inference for naga species as `mumble`.
- Added `mumble` handling in `tipHatMonsterNoise()` with the C `pline_msg` wording and no RNG or broader special-speaker systems.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes visible naga hatchling mumble`
- `worn helmet tip makes adjacent invisible naga mumble and maps it`

## Remaining Gaps

- Lich and salamander `MS_MUMBLE` paths remain unmodeled for local name fallback; this slice intentionally covers naga responders because they avoid visible-humanoid interception.
- The helper remains `tiphat()`-local and still does not replace full shared `domonnoise()`/`#chat` behavior.
- Other deterministic special speakers remain open, including focused `MS_SPELL` and peaceful `MS_CUSS` paths.
- Generic monster-data `msound` generation remains incomplete.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'naga|mumble|leocrotta|doppelganger imitate' test/shop-billing-helpers.test.mjs` (`4` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1207/1207` tests passed)
- `node --test test/*.mjs` (`1304/1304` tests passed)
- `npm run score` (`44/44` replay sessions passed)
