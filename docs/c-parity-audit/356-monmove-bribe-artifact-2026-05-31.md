# Monster-turn bribe artifact anger

Date: 2026-05-31

## Summary

Modeled the true apparent-target `MS_BRIBE` monster-turn branch where a peaceful non-tame demon briber reaches a hero wielding Excalibur or Demonbane. This is the first `demon_talk()` branch: it runs before faint/occupation cleanup, demon-prince reveal, demon-polyself greeting, and demand RNG. The demon now becomes hostile with the visible anger or unseen tension message, consumes no `rnd(80)` demand roll, and the monster-turn tail continues because the C branch returns `0`.

## Upstream source anchors

- `nethack-c/upstream/src/monmove.c:803`: demonic blackmail requires nearby `MS_BRIBE`, peaceful, non-tame, and not swallowed.
- `nethack-c/upstream/src/monmove.c:823`: true apparent-target blackmail calls `demon_talk(mtmp)` and only returns early when that call returns nonzero.
- `nethack-c/upstream/src/minion.c:267`: the Excalibur/Demonbane branch runs before prince reveal, demon-polyself, and demand RNG.
- `nethack-c/upstream/src/minion.c:268`: visible bribers print the angry message.
- `nethack-c/upstream/src/minion.c:270`: unseen bribers print the tension message.
- `nethack-c/upstream/src/minion.c:272`: the branch clears peaceful and tame state.
- `nethack-c/upstream/src/minion.c:273`: the branch calls `set_malign()`.
- `nethack-c/upstream/src/minion.c:275`: the branch returns `0`, so the monster turn is not paid off.

## JS changes

- `js/cmd.js`
  - Added `monsterTurnDemonBribeArtifact()` as a scheduler-safe wrapper around the existing wielded-artifact and demon-hostility helpers.
  - Uses the same visibility split as direct `demon_talk()`: visible anger vs unseen tension.
  - Does not call the demand helper, so no `rnd(80)` is consumed.
- `js/allmain.js`
  - Added `demonicBlackmailTrueTargetNearby()` to share the true-target/nearby gates between artifact and no-gold rows.
  - Calls the artifact row before the no-gold row in the demonic blackmail slot, matching C branch order.
  - Intentionally does not `continue` after artifact anger, matching `demon_talk()` returning `0`.
- `test/shop-billing-helpers.test.mjs`
  - Added a visible Excalibur regression that prints anger, consumes no demand RNG, and then attacks in the same monster turn.
  - Added an invisible demon-prince Excalibur regression that reports tension and keeps invisibility intact, proving artifact anger happens before the prince reveal.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --test --test-name-pattern="automatic monster turn .*briber" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`
- `git diff --check`

## Remaining gaps

- True apparent-target demon-polyself greeting/relocation remains a separate scheduler slice.
- True apparent-target positive-demand `MS_BRIBE`, including the prompt/offer path, deaf/unmeetable-demand handling, amulet demand shaping, and paid-off demon removal, remains separate.
- Broader `domonnoise()`/`#chat` sharing and generated monster sound/race metadata remain separate.
