# C Parity Audit 287: Tiphat Hostile Vampire Speech

## Sources

- `nethack-c/upstream/src/sounds.c:744-822`: `MS_VAMPIRE` selects vampire speech by tameness, peacefulness, hero form, and random hostile table.
- `nethack-c/upstream/src/sounds.c:785-818`: hostile vampires first check vampire-kindred hero form, then silver dragon hero forms, then call `rn2(SIZE(vampmsg))`.
- `nethack-c/upstream/src/polyself.c:1972-2145`: `body_part(BLOOD)` delegates to the current hero form and can produce values such as `blood`, `hemolymph`, `life force`, `juices`, or `beam`.
- `nethack-c/upstream/src/sounds.c:1517-1528`: visible humanoids are handled before `domonnoise()`, so visible hostile vampires keep the rude humanoid `#tip` response.

## JS Changes

- Implemented hostile `MS_VAMPIRE` handling in `tipHatMonsterNoise()` for directed invisible `#tip`.
- Added C-shaped deterministic hostile exceptions:
  - vampire-kindred hero forms say `"This is my hunting ground that you dare to prowl!"`,
  - silver dragon hero forms say the silver-sheen line with the adult/baby address,
  - both paths bypass RNG.
- Added the hostile ordinary random table with exactly one `rn2(2)` call:
  - `"I vant to suck your ${body_part(BLOOD)}!"`,
  - `"I vill come after ${an(hero form or race noun)} without regret!"`.
- Added narrow JS helpers for race noun selection and the `BLOOD` body-part subset needed by the hostile vampire table.
- Preserved the existing visible humanoid interception before vampire speech.

## Tests

Added focused canaries in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip gives hostile invisible vampire C random threat`
- `worn helmet tip hostile invisible vampire recognizes vampire polyself kindred without RNG`
- `worn helmet tip hostile invisible vampire recognizes silver dragon polyself without RNG`

The ordinary hostile canary asserts the branch shape and the `rn2(2)` call without depending on a seed-specific selected message.

## Remaining Gaps

- The new `BLOOD` helper is intentionally narrow; a shared JS `body_part()` equivalent would still be useful for future speech and combat text parity.
- Broader `domonnoise()` and `dotalk()` table parity remains incomplete outside the focused directed `#tip` canaries.
- Peaceful non-tame `MS_BRIBE`, broader seduction, quest speakers, priests, Oracle, and Death-specific Rider speech remain separate gaps.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "vampire" test/shop-billing-helpers.test.mjs` (`9` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1292/1292` tests passed)
- `node --test test/*.mjs` (`1389/1389` tests passed)
- `npm run score` (`44/44` replay sessions passed)
