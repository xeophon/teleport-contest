# C Parity Audit 302: Chat Quest Nemesis Speech

## Sources

- `nethack-c/upstream/src/sounds.c:688-731`: `domonnoise()` exits for deaf/silent cases, maps unseen responders, and dispatches `MS_NEMESIS` through `quest_chat()`.
- `nethack-c/upstream/src/sounds.c:1379-1404`: direct `#chat` clears wait strategy, handles deaf/eating targets first, then calls `domonnoise()`.
- `nethack-c/upstream/src/sounds.c:1506-1535`: directed helmet `#tip` uses visible humanoid responses before falling through to `domonnoise()` for adjacent responders.
- `nethack-c/upstream/src/quest.c:394-400`: `chat_with_nemesis()` always emits `discourage` and marks `met_nemesis` on first direct chat.
- `nethack-c/upstream/src/quest.c:473-488`: `quest_chat()` routes `MS_NEMESIS` to `chat_with_nemesis()`.
- `nethack-c/upstream/src/questpgr.c:552-557`: quest pager arrays select one entry with `rn2(nelems) + 1`.
- `nethack-c/upstream/dat/quest.lua`: role-specific `discourage` arrays for the supported embedded JS quest roles.

## JS Status

- Added `discourage` arrays for the quest roles already represented in `QUEST_ROLE_DATA`: Archeologist, Barbarian, Knight, Priest, and Wizard.
- `tipHatMonsterSound()` now infers `nemesis` for modeled quest nemeses marked with `mon.nemesis` or `data.nemesis`, matching the existing quest-level builders.
- `tipHatMonsterNoise()` now handles direct `MS_NEMESIS`/inferred nemesis chat through `questPagerText('discourage', { initCore: false })`.
- Direct nemesis speech marks `game.quest_status.met_nemesis` without introducing the autonomous `nemesis_speaks()` state machine.
- `questPagerText()` now supports the C-shaped `%t` suffix for quest text such as Priest `%lt`, stripping only a leading `the`.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `chat with quest nemesis uses discourage pager text and marks nemesis met`
- `chat with quest nemesis data marker infers discourage pager text`
- `worn helmet tip with invisible quest nemesis infers nemesis speech`
- `quest nemesis pager strips leader article with percent-t token`

These tests assert visible direct `#chat`, invisible directed helmet `#tip`, builder-style `nemesis` data inference, `met_nemesis` state, wait-strategy clearing, invisible mapping, and the expected `rn2(10)` pager-array RNG shape.

## Remaining Gaps

- `QUEST_ROLE_DATA` is still an embedded quest-text subset rather than generated from upstream `dat/quest.lua`.
- Autonomous `nemesis_speaks()` behavior remains separate: `nemesis_first`, `nemesis_next`, `nemesis_other`, `nemesis_wantsit`, `made_goal` updates, and the `rn2(5)` battle/out-of-dialogue gates are not implemented here.
- `MS_LEADER` remains a broader quest state-machine follow-up.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "quest nemesis|nemesis speech|percent-t" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44` replay sessions passed)
- `git diff --check`
