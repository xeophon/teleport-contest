# 310 - Automatic Quest Nemesis And Prisoner Speech

## C anchors

- `nethack-c/upstream/src/monmove.c:717`: waiting close quest monsters call `quest_talk()` and spend their monster action.
- `nethack-c/upstream/src/monmove.c:979`: active nearby quest monsters call `quest_talk()` at the end of monster action.
- `nethack-c/upstream/src/quest.c:494`: `quest_talk()` dispatches leader id first, then `MS_NEMESIS`, then `MS_DJINNI`.
- `nethack-c/upstream/src/quest.c:513`: `quest_stat_check()` records whether the nemesis started the action adjacent and mobile.
- `nethack-c/upstream/src/quest.c:402`: automatic nemesis speech uses `nemesis_wantsit`, `nemesis_first`, `nemesis_next`, `nemesis_other`, or occasional `discourage`.
- `nethack-c/upstream/src/quest.c:451`: prisoner speech only fires for the prisoner while `STRAT_WAITMASK` is set.
- `nethack-c/upstream/src/quest.c:460`: prisoner speech clears the wait strategy, makes the prisoner peaceful, adjusts alignment, and angers guards.

## JS changes

- Added missing `nemesis_first`, `nemesis_next`, `nemesis_other`, and `nemesis_wantsit` quest texts for the implemented quest roles.
- Added `maybeQueueQuestTalk()` as the automatic `quest_talk()` dispatcher while keeping `maybeQueueQuestLeaderTalk()` for direct leader chat compatibility.
- Updated monster-turn quest talk call sites to use the generic dispatcher.
- Captured the nemesis battle state before monster movement and passed it through to preserve C's distinction between starting adjacent and moving adjacent.
- Automatic nemesis speech now follows C branch order, including made-goal progression and the no-`met_nemesis` battle malediction branch.
- Automatic prisoner speech now frees the prisoner, clears waiting state, makes the prisoner peaceful, adds 3 alignment record points, and angers watchmen/watch captains.
- Automatic nemesis pagers reuse the existing automatic follow-up marker so dismissing them does not spend a second hero turn.

## Focused tests

- `automatic quest nemesis first speech uses nemesis_first and advances made_goal`
- `automatic quest nemesis wants carried quest artifact`
- `automatic quest nemesis battle malediction does not mark met_nemesis`
- `automatic prisoner speech frees prisoner and angers watch`
- `automatic prisoner speech from monster turn does not spend another hero turn`

## Verification

- `node --check js/cmd.js`
- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='automatic quest (nemesis|prisoner)|automatic quest leader|quest nemesis|maps invisible djinni' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern='quest leader|quest nemesis|quest guardian|prisoner|MS_DJINNI|Bell of Opening|Amulet of Yendor' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.test.mjs`
- `npm run score` (44/44)
- `git diff --check`

## Remaining gaps

- Prisoner guard anger is modeled for watchmen and watch captains, matching the current JS town guard representation; broader guard AI parity remains outside this slice.
- The automatic quest dispatcher still lives beside the existing JS command helpers rather than replacing direct `#chat` monster-noise routing.
