# C Parity Audit 271: Tiphat Nymph Seduce Speech

## Sources

- `nethack-c/upstream/include/monflag.h:46`: `MS_SEDUCE` is the seduction speech sound.
- `nethack-c/upstream/include/monsters.h:702-721`: wood, water, and mountain nymphs use `MS_SEDUCE`, `S_NYMPH`, `M1_HUMANOID`, and `M2_FEMALE`.
- `nethack-c/upstream/include/monsters.h:2931-2934`: amorous demons also use `MS_SEDUCE`, but their compatible seduction path is not a nymph speech branch.
- `nethack-c/upstream/src/sounds.c:1105-1128`: `MS_SEDUCE` bypasses `doseduce()` for nymphs, then chooses between `"Hello, sailor."`, `comes on to you.`, and `cajoles you.`.
- `nethack-c/upstream/src/sounds.c:1115`: with seduction enabled, same-gender nymph speech forces `swval = 0` and uses no RNG.
- `nethack-c/upstream/src/sounds.c:1222-1238`: `pline_msg` is emitted unquoted with `Monnam(mtmp)`, while `verbl_msg` is quoted via verbal speech.
- `nethack-c/upstream/src/sounds.c:1449-1528`: worn-helmet `#tip` prints the doffing line, intercepts visible humanoids before `domonnoise()`, and maps invisible responders.

## JS Coverage

- `tipHatMonsterSound()` now infers `seduce` for nymph names, explicit nymph markers, and `mlet: 'n'`.
- Explicit `MS_SEDUCE` continues to normalize to `seduce` through the existing `MS_` sound-name path.
- `tipHatMonsterHumanoid()` now recognizes nymphs, preserving C's visible peaceful humanoid wave/tip interception before sound dispatch.
- `tipHatMonsterNoise()` implements the nymph speech branch:
  - same-gender nymphs deterministically produce `cajoles you.` with no RNG,
  - opposite-gender nymphs use the C `rn2(3)` fork for `"Hello, sailor."`, `comes on to you.`, or `cajoles you.`,
  - non-nymph `MS_SEDUCE` is deferred so this slice does not fake `doseduce()`.
- `tipInvisibleExplicitSound()` gained a `heroFemale` option so tests can set the hero gender after stable state setup.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- explicit same-gender invisible `MS_SEDUCE` nymph speech without RNG,
- inferred same-gender invisible nymph seduction without RNG,
- visible peaceful seducing nymphs staying on the humanoid wave response before seduction speech.

## Remaining Gaps

- Non-nymph compatible seducers still need real `doseduce()` behavior.
- This slice does not cover the `SYSOPT_SEDUCE` disabled fork.
- Opposite-gender nymph speech is implemented but not seed-free tested here.
- Combat seduction/theft attacks remain separate from directed helmet tipping.
- Broader shared `domonnoise()` and `#chat` are still not unified with directed helmet tipping.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip (makes same-gender invisible nymph|infers same-gender invisible nymph|keeps visible peaceful seducing nymph|makes tame invisible briber|makes tame invisible lawful briber)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1259/1259` tests passed)
- `node --test test/*.mjs` (`1356/1356` tests passed)
- `npm run score` (`44/44` replay sessions passed)
