# C Parity Audit 303: Chat Quest Leader Encourage Speech

## Sources

- `nethack-c/upstream/src/sounds.c:695-731`: `domonnoise()` treats the actual quest leader as `MS_LEADER`, maps unseen responders, and dispatches quest speakers through `quest_chat()`.
- `nethack-c/upstream/src/sounds.c:1379-1404`: direct `#chat` clears wait strategy, handles deaf/eating targets first, then calls `domonnoise()`.
- `nethack-c/upstream/src/quest.c:282-369`: `chat_with_leader()` uses `encourage` when `got_quest` is set and the quest artifact has not been returned.
- `nethack-c/upstream/src/quest.c:473-480`: `quest_chat()` recognizes the actual leader by `leader_m_id`.
- `nethack-c/upstream/src/questpgr.c:552-557`: quest pager arrays select one entry with `rn2(nelems) + 1`.
- `nethack-c/upstream/dat/quest.lua`: role-specific `encourage` arrays for the supported embedded JS quest roles.

## JS Status

- Added `encourage` arrays for the quest roles already represented in `QUEST_ROLE_DATA`: Archeologist, Barbarian, Knight, Priest, and Wizard.
- Direct `#chat` with the current role leader after assignment now uses source-backed `encourage` text instead of falling through to no response.
- Direct leader chat clears the wait strategy before speech, matching the direct `#chat` path.
- Direct leader chat is no longer suppressed by the automatic-talk-only `mon.questTalked` marker.
- Automatic leader talk remains scoped to the existing intro flow.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `chat with assigned quest leader uses encourage pager text`
- `direct quest leader chat is not suppressed by prior automatic talk marker`

These tests assert direct `#chat` behavior, source-backed `rn2(10)` encourage selection, wait-strategy clearing, turn consumption, and repeat direct chat after an automatic-talk marker.

## Remaining Gaps

- The broader C `chat_with_leader()` state machine still needs follow-up slices: `got_thanks`, artifact return, `leader_first`/`leader_next` on/off quest start level, converted `banished`, rejection/expulsion details, and actual `leader_m_id` identity.
- `QUEST_ROLE_DATA` remains an embedded quest-text subset rather than generated from upstream `dat/quest.lua`.
- Leader and nemesis pronoun gender still use the current simplified replacement path.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "quest leader|quest nemesis|quest guardian|guardtalk|percent-t" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44` replay sessions passed)
- `git diff --check`
