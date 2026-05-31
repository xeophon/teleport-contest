# 309 - Automatic Quest Leader Speech

## C anchors

- `nethack-c/upstream/src/monmove.c:717`: waiting quest monsters call `quest_talk()` when the hero comes near.
- `nethack-c/upstream/src/monmove.c:979`: active nearby quest monsters also call `quest_talk()` during monster movement.
- `nethack-c/upstream/src/quest.c:495`: automatic quest leader speech dispatches through `leader_speaks()`.
- `nethack-c/upstream/src/quest.c:374`: a non-peaceful leader uses `leader_last` only before `pissed_off` has been set.
- `nethack-c/upstream/src/quest.c:381`: hostile automatic leader speech sets `pissed_off`.
- `nethack-c/upstream/src/quest.c:382`: hostile automatic leader speech clears the wait strategy.
- `nethack-c/upstream/src/quest.c:386`: automatic leader speech suppresses normal leader chat away from the quest start level.
- `nethack-c/upstream/src/quest.c:389`: non-pissed automatic leader speech reaches `chat_with_leader()`.
- `nethack-c/upstream/src/quest.c:284`: `chat_with_leader()` exits before all normal branches when the leader is non-peaceful or already pissed.
- `nethack-c/upstream/src/quest.c:288`: carrying the quest artifact before meeting the nemesis marks the hero as a cheater.
- `nethack-c/upstream/src/quest.c:294`: `got_thanks` takes precedence over carried quest artifact return.
- `nethack-c/upstream/src/quest.c:303`: carrying the quest artifact before `got_thanks` calls `finish_quest()`.
- `nethack-c/upstream/src/quest.c:314`: assigned heroes get the leader's `encourage` pager.
- `nethack-c/upstream/src/quest.c:321`: first/repeat leader introductions use `leader_first` and `leader_next`.

## JS changes

- Added embedded `leader_last` quest text for Archeologist, Barbarian, Knight, Priest, and Wizard leaders.
- Removed automatic leader suppression by the JS-only `questTalked` marker so automatic speech can continue after the initial introduction.
- Automatic quest leader speech now mirrors C's high-level branch order: hostile `leader_last`, off-start suppression, `got_thanks`, carried quest artifact return, assigned-quest encouragement, and first/repeat introductions.
- Added an automatic-leader continuation flag so pager dismissal does not spend an extra hero command turn for monster-turn speech.
- Kept direct `#chat` turn consumption unchanged for the same follow-up pagers.
- Hostile automatic leader speech clears wait strategy and sets `quest_status.pissed_off`; repeat hostile automatic speech does not show `leader_last` again.
- Automatic rejection/expulsion still resumes the deferred turn tail after the level transfer, matching the C monster-turn expulsion flow.

## Focused tests

- `automatic quest leader talk from monster turn queues leader_first on quest start`
- `automatic quest leader speech is suppressed away from quest start`
- `automatic hostile quest leader speech uses leader_last once`
- `automatic quest leader rejection resumes deferred turn tail after expulsion`
- `automatic quest leader speech uses encourage despite prior automatic marker`
- `automatic quest leader speech after thanks uses posthanks without charging another turn`
- `automatic quest leader artifact return completes without charging another turn`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "automatic quest leader|direct quest leader|converted quest leader|already-pissed quest leader|off-start quest leader|repeat off-start quest leader|assigned quest leader" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "quest leader|quest nemesis|quest guardian|Bell of Opening|Amulet of Yendor" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.test.mjs`
- `npm run score` (44/44)
- `git diff --check`

## Remaining gaps

- Automatic `leader_speaks()` is still modeled through the existing JS monster-turn control flow rather than a shared quest-speaker engine.
- Already-pissed automatic leaders have no repeat `leader_last` text, matching C, but precise per-monster action scheduling for that no-message case remains broader monster-turn parity work.
- Automatic quest nemesis and prisoner speech remain separate `quest_talk()` branches.
