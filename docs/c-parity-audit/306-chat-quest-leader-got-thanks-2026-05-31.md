# 306 - Chat Quest Leader Got Thanks

## C anchors

- `nethack-c/upstream/src/sounds.c:1388`: direct `#chat` clears the target monster's wait strategy before speech.
- `nethack-c/upstream/src/sounds.c:1408`: direct monster chat calls `domonnoise()`.
- `nethack-c/upstream/src/sounds.c:695`: actual quest leaders are remapped to `MS_LEADER`.
- `nethack-c/upstream/src/sounds.c:728`: quest speakers dispatch to `quest_chat()`.
- `nethack-c/upstream/src/sounds.c:1241`: successful direct monster speech consumes a turn.
- `nethack-c/upstream/src/quest.c:284`: pissed or non-peaceful leaders return before the `got_thanks` branch.
- `nethack-c/upstream/src/quest.c:294`: when `Qstat(got_thanks)` is true, the leader uses `finish_quest(NULL)` if the hero has the real Amulet, otherwise `qt_pager("posthanks")`.
- `nethack-c/upstream/src/quest.c:251`: `finish_quest(NULL)` with the real Amulet reaches the `hasamulet` pager path without quest artifact return side effects.
- `nethack-c/upstream/src/quest.c:303`: quest artifact return is a separate branch and is intentionally left for another slice.
- `nethack-c/upstream/dat/quest.lua`: role-specific `hasamulet` and `posthanks` text for the embedded quest roles.

## JS changes

- Added `hasamulet` and `posthanks` quest text for the currently embedded quest roles: Archeologist, Barbarian, Knight, Priest, and Wizard.
- Added `%dJ` replacement support for deity possessive pronoun text used by Barbarian `hasamulet`.
- Direct leader chat now handles `quest_status.got_thanks` before the ordinary assigned-quest encourage path.
- The follow-up pager uses a new `questLeaderFollowupMore` mode that consumes the chat turn after the text window is dismissed.
- The slice does not implement quest artifact return, Bell checks, `offeredit`, `offeredit2`, or Amulet identification side effects.

## Focused tests

- `direct quest leader chat after thanks without Amulet uses posthanks`
- `direct quest leader chat after thanks with Amulet uses hasamulet`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "direct quest leader chat after thanks|already-pissed quest leader|converted quest leader rejection uses banished" test/shop-billing-helpers.test.mjs`

## Remaining gaps

- Quest artifact return still needs `offeredit`, `offeredit2`, Bell-of-Opening follow-up, artifact identification, and `qcompleted` handling.
- Automatic leader speech after `got_thanks` remains separate from direct `#chat`.
