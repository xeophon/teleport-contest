# Monster-turn bribe demon-polyself greeting

Date: 2026-05-31

## Summary

Modeled the true apparent-target `MS_BRIBE` monster-turn branch where the hero is polymorphed into a demon. After the already-covered artifact anger row, `demon_talk()` interrupts occupation state, reveals an invisible demon prince, greets a demon-form hero as kin, optionally relocates the briber, skips demand RNG and offer prompts, and returns `1`, stopping that monster's turn.

## Upstream source anchors

- `nethack-c/upstream/src/monmove.c:803`: demonic blackmail requires nearby `MS_BRIBE`, peaceful, non-tame, and not swallowed.
- `nethack-c/upstream/src/monmove.c:823`: true apparent-target blackmail returns early when `demon_talk(mtmp)` returns nonzero.
- `nethack-c/upstream/src/minion.c:267`: Excalibur/Demonbane artifact anger wins before the demon-polyself row.
- `nethack-c/upstream/src/minion.c:288`: invisible demon princes are revealed before the demon-polyself check.
- `nethack-c/upstream/src/minion.c:299`: demon-polyself is tested by demon monster class.
- `nethack-c/upstream/src/minion.c:300`: non-deaf heroes receive the "Good hunting" greeting.
- `nethack-c/upstream/src/minion.c:303`: deaf heroes who can see the demon get the generic "says something" message.
- `nethack-c/upstream/src/minion.c:305`: unrestricted bribers relocate with `RLOC_MSG`.
- `nethack-c/upstream/src/minion.c:307`: the demon-polyself row returns `1`, so the monster does not continue into its attack tail.
- `nethack-c/upstream/src/minion.c:309`: demand RNG begins after the demon-polyself row, so this branch consumes no `rnd(80)`.

## JS changes

- `js/allmain.js`
  - Added `demonicBlackmailPrinceReveal()` for the monster-turn true-target path.
  - Added `maybeDemonicBlackmailTrueTargetDemonPolyself()` between artifact anger and no-gold demand.
  - The helper keeps the demon peaceful, emits the kin greeting or deaf visible fallback, relocates through the existing `RLOC_MSG`-style helper, and returns handled so the monster turn stops.
- `test/shop-billing-helpers.test.mjs`
  - Added a true-target invisible demon-prince regression proving reveal precedes the demon-polyself greeting and relocation.
  - Added a teleport-restricted water demon regression proving the branch returns early without demand RNG or an adjacent attack.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --test --test-name-pattern="automatic monster turn .*briber" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`
- `git diff --check`

## Remaining gaps

- True apparent-target positive-demand `MS_BRIBE`, including prompt scheduling, deaf/unmeetable-demand handling, amulet demand shaping, and paid-off demon removal, remains separate.
- Broader `domonnoise()`/`#chat` sharing and generated monster sound/race metadata remain separate.
