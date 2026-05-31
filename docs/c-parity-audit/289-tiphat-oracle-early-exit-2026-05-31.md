# C Parity Audit 289: Tiphat Oracle Early Exits

## Sources

- `nethack-c/upstream/include/monflag.h:55`: `MS_ORACLE` is the consultation sound.
- `nethack-c/upstream/include/monsters.h:2738-2745`: the Oracle uses `MS_ORACLE`, is humanoid, unique, peaceful, and female.
- `nethack-c/upstream/src/sounds.c:719-724`: `domonnoise()` maps unseen responders before dispatching `MS_ORACLE` to `doconsult()`.
- `nethack-c/upstream/src/rumors.c:703-715`: `doconsult()` first clears multi, then returns `ECMD_OK` after the hostile no-mood line or no-gold line.
- `nethack-c/upstream/src/rumors.c:717-766`: paid minor/major consultations involve prompts, gold transfer, rumors/oracles, experience, and wisdom exercise.
- `nethack-c/upstream/src/sounds.c:1506-1528`: visible humanoids are handled by the visual `tiphat()` response before `domonnoise()`; invisible `doconsult()` early exits return false to `tiphat()`, which then falls through to `Nothing happens.`

## JS Changes

- Added `tipHatMonsterSound()` inference for `Oracle` as `oracle`.
- Added `tipHatMonsterNoise()` early exits for:
  - hostile Oracle: `It is in no mood for consultations.`
  - peaceful Oracle with no top-level gold: `You have no gold.`
- Preserved unseen mapping for Oracle early exits.
- Extended directed helmet tipping to preserve C's message-then-fallback shape when a sound branch emits a message but does not consume command time.
- Left paid consultation prompt, gold transfer, and oracle/rumor output deliberately unmodeled in this slice.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes hostile invisible Oracle decline consultation before fallback`
- `worn helmet tip makes peaceful invisible Oracle with no gold report it before fallback`

The hostile canary covers name-based Oracle inference. The no-gold canary uses explicit `MS_ORACLE`, so the `MS_` normalization path is covered too. Both tests assert that the invisible Oracle is mapped, the wait strategy is cleared, no RNG is consumed, and the C-shaped `Nothing happens.` fallback remains after the early `doconsult()` message.

## Remaining Gaps

- Paid minor and major Oracle consultations still need prompt handling, gold transfer, rumor/oracle text, experience gain, achievement state, and wisdom exercise.
- This remains local to directed helmet tipping rather than a shared `domonnoise()`/`#chat` implementation.
- Death-specific Rider speech, peaceful non-tame `MS_BRIBE`, broader seduction, quest speakers, and priests remain separate gaps.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "Oracle|oracle|djinni|guard" test/shop-billing-helpers.test.mjs` (`7` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1297/1297` tests passed)
- `node --test test/*.mjs` (`1394/1394` tests passed)
- `npm run score` (`44/44` replay sessions passed)
