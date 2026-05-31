# C Parity Audit 288: Tiphat Lich And Salamander Mumble

## Sources

- `nethack-c/upstream/src/sounds.c:984-986`: `MS_MUMBLE` emits `mumbles incomprehensibly.` through the ordinary `pline_msg` path with no RNG.
- `nethack-c/upstream/src/sounds.c:1222-1241`: `pline_msg` output is prefixed with `Monnam(mtmp)`, while unseen responders are mapped after a successful `domonnoise()` response.
- `nethack-c/upstream/src/sounds.c:1506-1528`: visible humanoids are handled by the `tiphat()` visual response before `domonnoise()`, so visible liches and salamanders do not reach the mumble branch.
- `nethack-c/upstream/include/monsters.h:1864-1897`: `lich`, `demilich`, `master lich`, and `arch-lich` all use `MS_MUMBLE`.
- `nethack-c/upstream/include/monsters.h:1972-2047`: naga hatchlings and adult nagas use the same `MS_MUMBLE` branch already modeled by the previous slice.
- `nethack-c/upstream/include/monsters.h:3316-3324`: `salamander` also uses `MS_MUMBLE` and is humanoid.

## JS Changes

- Added a local `tipHatMonsterSound()` fallback set for the remaining `MS_MUMBLE` names:
  - `lich`
  - `demilich`
  - `master lich`
  - `arch-lich`
  - `salamander`
- Left explicit `msound` handling and the existing naga name fallback intact.
- Preserved the existing visible humanoid interception before sound handling.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes invisible lich family mumble without RNG`
- `worn helmet tip makes invisible salamander mumble without RNG`
- `worn helmet tip at visible hostile lich uses humanoid response before mumble`

The lich-family canary loops over all four C lich species and asserts that no RNG is consumed.

## Remaining Gaps

- This is still a local `#tip` sound inference fallback, not a generated monster-data `msound` table.
- Full shared `domonnoise()` and `#chat` parity remains broader than this slice.
- Death-specific Rider speech, peaceful non-tame `MS_BRIBE`, broader seduction, quest speakers, priests, and Oracle speech remain separate gaps.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "mumble|lich|salamander" test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1295/1295` tests passed)
- `node --test test/*.mjs` (`1392/1392` tests passed)
- `npm run score` (`44/44` replay sessions passed)
