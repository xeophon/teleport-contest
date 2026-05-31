# Monster-turn no-gold bribe

Date: 2026-05-31

## Summary

Modeled the narrow true apparent-target `MS_BRIBE` monster-turn branch where a peaceful non-tame demon briber reaches an ordinary hero who has no gold. The scheduler now calls the shared demon-demand calculation, consumes the C `rnd(80)` demand roll even when cash is zero, turns the demon hostile silently when the computed demand is zero, and then lets the monster-turn tail continue because `demon_talk()` returns `0`.

## Upstream source anchors

- `nethack-c/upstream/src/monmove.c:790`: `distfleeck()` establishes `nearby` before demonic blackmail.
- `nethack-c/upstream/src/monmove.c:803`: demonic blackmail requires nearby `MS_BRIBE`, peaceful, non-tame, and not swallowed.
- `nethack-c/upstream/src/monmove.c:823`: true apparent-target blackmail calls `demon_talk(mtmp)` and only returns early when that call returns nonzero.
- `nethack-c/upstream/src/minion.c:289`: an invisible demon prince can appear before the demand calculation.
- `nethack-c/upstream/src/minion.c:309`: `demon_talk()` reads hero gold with `money_cnt(gi.invent)`.
- `nethack-c/upstream/src/minion.c:310`: the demand formula still consumes `rnd(80)`.
- `nethack-c/upstream/src/minion.c:313`: zero demand turns the demon hostile with no message and returns `0`.

## JS changes

- `js/cmd.js`
  - Added `monsterTurnDemonBribeNoGold()` as a scheduler-safe wrapper around the existing demon bribe demand and hostility helpers.
  - The helper only handles the no-gold row: no bribe artifact, no demon polyself, and no positive-cash prompt.
  - Reuses the existing demon-prince reveal helper before the zero-demand anger branch.
- `js/allmain.js`
  - Imported the scheduler helper and added `maybeDemonicBlackmailTrueTargetNoGold()`.
  - Reused the C-shaped true-target and nearby guards after the false-image branch.
  - Intentionally does not `continue` after zero-demand hostility, matching `demon_talk()` returning `0`.
- `test/shop-billing-helpers.test.mjs`
  - Added a monster-turn regression for visible adjacent Asmodeus with no hero gold.
  - Added an unseen ordinary water demon regression to verify the true-target call is not gated on visibility.
  - Added an invisible demon-prince no-gold regression for the reveal-before-anger path.
  - Added a visible adjacent attack regression proving the scheduler does not stop or immediately continue after zero-demand anger.
  - Verifies silent hostility, no bribe command mode, no demand prompt text, and exactly one `rnd(80)` demand roll despite scheduler-side movement RNG.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --test --test-name-pattern="automatic monster turn true briber" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`
- `git diff --check`

## Remaining gaps

- True apparent-target positive-demand `MS_BRIBE` is still not scheduled from monster turns.
- True apparent-target bribe-artifact anger, positive-demand invisible demon-prince reveal, demon-polyself greeting/relocation, deaf/unmeetable-demand handling, and paid-off demon removal remain separate scheduler slices.
- Broader `domonnoise()`/`#chat` sharing and generated monster sound/race metadata remain separate.
