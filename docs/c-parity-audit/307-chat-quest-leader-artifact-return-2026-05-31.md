# 307 - Chat Quest Leader Artifact Return

## C anchors

- `nethack-c/upstream/src/sounds.c:695`: actual quest leaders are remapped to `MS_LEADER`.
- `nethack-c/upstream/src/sounds.c:728`: quest speakers dispatch to `quest_chat()`.
- `nethack-c/upstream/src/sounds.c:1241`: successful direct monster speech consumes a turn.
- `nethack-c/upstream/src/quest.c:284`: pissed or non-peaceful quest leaders return before all completion branches.
- `nethack-c/upstream/src/quest.c:288`: carrying the quest artifact before meeting the nemesis marks the hero as a cheater.
- `nethack-c/upstream/src/quest.c:294`: `got_thanks` takes precedence over the carried quest artifact branch.
- `nethack-c/upstream/src/quest.c:303`: when `u.uhave.questart` is set, direct leader chat calls `finish_quest()` with the carried quest artifact if present.
- `nethack-c/upstream/src/quest.c:251`: if the hero has the real Amulet, `finish_quest()` uses `hasamulet`, identifies the Amulet, and skips the Bell warning.
- `nethack-c/upstream/src/quest.c:262`: normal artifact completion uses `offeredit`.
- `nethack-c/upstream/src/quest.c:267`: missing Bell of Opening queues the common `quest_complete_no_bell` pager.
- `nethack-c/upstream/src/quest.c:270`: `got_thanks` is set by `finish_quest()`.
- `nethack-c/upstream/src/quest.c:272`: when a quest artifact object is supplied, C sets `u.uevent.qcompleted` and fully identifies the artifact without removing or unwielding it.
- `nethack-c/upstream/dat/quest.lua`: role-specific `offeredit`/`offeredit2` text and common missing-Bell text.

## JS changes

- Added common `quest_complete_no_bell` text.
- Added `offeredit` and `offeredit2` text for the embedded quest roles: Archeologist, Barbarian, Knight, Priest, and Wizard.
- Direct quest leader chat now marks `quest_status.cheater` when `uhave.questart` is true before the nemesis has been met.
- Direct quest leader chat now handles the `!got_thanks && uhave.questart` completion branch before assigned-quest encouragement.
- Quest artifact completion keeps the artifact in inventory, preserves worn state, identifies it, sets `got_thanks`, sets `u.uevent.qcompleted`, and mirrors that onto `quest_status.qcompleted` for existing JS quest gates.
- If the hero has the real Amulet during artifact completion, the leader shows `hasamulet`, identifies the Amulet, and does not queue the Bell warning.
- If the hero lacks the Bell during artifact completion, the common missing-Bell pager is queued after the role `offeredit` pager and the chat turn is consumed after the final text window.
- The existing `got_thanks` direct branch now identifies the real Amulet when the leader uses `hasamulet`; it still ignores a carried artifact in that branch, matching C precedence.

## Focused tests

- `direct quest leader chat completes returned artifact without taking it`
- `direct quest leader artifact return warns when Bell is missing`
- `direct quest leader artifact return with Amulet uses hasamulet and identifies both`
- `direct quest leader chat after thanks ignores carried artifact without Amulet`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "direct quest leader.*(artifact|after thanks)|converted quest leader|already-pissed quest leader|off-start quest leader|assigned quest leader" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "quest leader|quest nemesis|quest guardian|Bell of Opening|Amulet of Yendor" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.test.mjs`
- `npm run score` (44/44)
- `git diff --check`

## Remaining gaps

- `offeredit2` is now embedded but direct carried-artifact leader chat does not reach it after `got_thanks`; C only reaches that path through other `finish_quest(obj)` callers such as thrown/kicked quest artifact handling.
- Automatic quest leader speech still needs a separate `leader_speaks()` parity slice.
- Demon bribe offer input and resolution remain a separate `MS_BRIBE` slice.
