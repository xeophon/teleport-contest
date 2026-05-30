# C Parity Audit 255: Tiphat Imitate

## Sources

- `nethack-c/upstream/src/sounds.c:1417-1423`: directed `tiphat()` only treats adjacent monsters as responders when they are responsive, can see, and are not blocked by helpless/no-eyes conditions.
- `nethack-c/upstream/src/sounds.c:1503-1529`: visible humanoids are handled before `domonnoise()`, and adjacent fallback responders reach `domonnoise()`.
- `nethack-c/upstream/src/sounds.c:965-967`: `MS_IMITATE` emits `imitates you.` through the ordinary `pline_msg` path.
- `nethack-c/upstream/src/sounds.c:1222-1241`: `pline_msg` is emitted with `Monnam(mtmp)` prepended, unseen responders have already been mapped, and `domonnoise()` returns `ECMD_TIME`.
- `nethack-c/upstream/include/monsters.h:846-853`: leocrottas are non-humanoid quadrupeds with `MS_IMITATE`, making them a direct visible `#tip` candidate.
- `nethack-c/upstream/include/monsters.h:1215-1224,2688-2695`: Aleaxes and doppelgangers also use `MS_IMITATE`, but their humanoid shape means visible directed `#tip` intercepts them before `domonnoise()`.

## JS Changes

- Added `tiphat()` sound inference for leocrotta, Aleax, and doppelganger as `imitate`.
- Ordered leocrotta's `imitate` inference before the generic quadruped `neigh` fallback.
- Added `imitate` handling in `tipHatMonsterNoise()` with the C message shape and no RNG or broader monster systems.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes visible leocrotta imitate instead of neigh`
- `worn helmet tip makes adjacent invisible doppelganger imitate and maps it`

## Remaining Gaps

- Visible humanoid imitators still use the existing `tiphat()` humanoid response path, matching C ordering but leaving full shared `domonnoise()`/`#chat` behavior unmodeled.
- Other deterministic special speakers remain open, including `MS_MUMBLE` and focused `MS_SPELL`/peaceful `MS_CUSS` paths.
- Generic monster-data `msound` generation remains incomplete; this slice only adds source-backed local fallbacks for covered `tiphat()` paths.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'leocrotta|doppelganger imitate|gecko|laugh|groan' test/shop-billing-helpers.test.mjs` (`9` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1205/1205` tests passed)
- `node --test test/*.mjs` (`1302/1302` tests passed)
- `npm run score` (`44/44` replay sessions passed)
