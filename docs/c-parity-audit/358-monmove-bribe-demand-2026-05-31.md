# Monster-turn bribe demand prompt

Date: 2026-05-31

## Summary

Modeled the true apparent-target `MS_BRIBE` monster-turn positive-demand branch. A peaceful untame briber with gold now reveals invisible demon princes, computes the C demand, schedules the offer prompt for hearing heroes after any pending `--More--`, forces an unmeetable demand for deaf heroes before angering the demon, lets failed offers resume the same demon's attack tail, and lets a full automatic-turn bribe remove the demon while scheduling the monster-turn tail.

## Upstream source anchors

- `nethack-c/upstream/src/monmove.c:803`: demonic blackmail requires nearby `MS_BRIBE`, peaceful, non-tame, and not swallowed.
- `nethack-c/upstream/src/monmove.c:823`: true apparent-target blackmail returns early when `demon_talk(mtmp)` returns nonzero.
- `nethack-c/upstream/src/minion.c:288`: invisible demon princes are revealed before demand handling.
- `nethack-c/upstream/src/minion.c:309`: demand uses carried cash, `rnd(80)`, Gehennom home bonus, and same-alignment divisor.
- `nethack-c/upstream/src/minion.c:313`: zero demand or negative occupation time angers the demon and returns `0`.
- `nethack-c/upstream/src/minion.c:318`: Amulet carriers and deaf heroes force the demand above carried cash.
- `nethack-c/upstream/src/minion.c:329`: hearing heroes see the explicit demand; deaf visible heroes see the generic demand message.
- `nethack-c/upstream/src/minion.c:334`: non-deaf positive demand calls `bribe()` with `How much will you offer?`.
- `nethack-c/upstream/src/minion.c:335`: full offers make the demon vanish laughing.
- `nethack-c/upstream/src/minion.c:343`: refused, zero, or insufficient offers anger the demon and return `0`.
- `nethack-c/upstream/src/minion.c:350`: successful bribes call `mongone()` and return `1`.
- `nethack-c/upstream/src/minion.c:367`: `bribe()` parses the numeric offer, handles fumble/refusal text, and transfers gold before outcome resolution.

## JS changes

- `js/cmd.js`
  - Added `monsterTurnDemonBribeDemand()` for automatic monster-turn demand scheduling.
  - Extended demand shaping so deaf heroes get the same unmeetable-demand path as Amulet carriers.
  - Preserved monster-turn context across `demonBribeOffer` input so full payment removes the demon, while failed offers resume the same demon after the already-run preturn work.
  - Delayed `demonBribeOffer` input mode until pending `--More--` output has displayed the demand.
- `js/allmain.js`
  - Added the true-target positive-demand hook after artifact, demon-polyself, and no-gold precedence.
  - Stored the automatic prompt state in the existing `demonBribeOffer` command mode and stopped the current monster turn while the prompt is active.
  - Allowed same-monster resume state to drive monster-turn processing even when the monster's movement was already debited before a prompt.
- `test/shop-billing-helpers.test.mjs`
  - Added automatic positive-demand prompt coverage.
  - Added automatic full-offer coverage proving demon removal and tail scheduling.
  - Added pending-`--More--` coverage proving offer input is not accepted before the demand page is shown.
  - Added automatic refusal coverage proving the same demon resumes its attack tail.
  - Added automatic deaf-demand coverage proving the forced unmeetable demand, generic visible demand message, and anger path.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `git diff --check`
- `node --test --test-name-pattern="automatic monster turn bribe prompt waits|automatic monster turn refused bribe|automatic monster turn .*briber|automatic monster turn .*bribe" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`

## Remaining gaps

- Dedicated automatic Amulet-carrier demand regression and partial automatic-offer aftermath rows remain separate.
- Broader `domonnoise()`/`#chat` sharing and generated monster sound/race metadata remain separate.
