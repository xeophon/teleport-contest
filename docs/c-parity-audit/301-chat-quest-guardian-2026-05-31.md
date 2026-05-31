# C Parity Audit 301: Chat Quest Guardian Speech

## Sources

- `nethack-c/upstream/src/sounds.c:688-731`: `domonnoise()` maps unseen responders, preserves the player's own quest guardian as `MS_GUARDIAN`, and dispatches quest speakers through `quest_chat()`.
- `nethack-c/upstream/src/quest.c:441-447`: `chat_with_guardian()` chooses `guardtalk_after` only when the hero has the quest artifact and the nemesis is dead; otherwise it chooses `guardtalk_before`.
- `nethack-c/upstream/src/quest.c:473-488`: `quest_chat()` routes `MS_GUARDIAN` to `chat_with_guardian()`.
- `nethack-c/upstream/src/questpgr.c:552-557`: quest pager arrays select one entry with `rn2(nelems) + 1`.
- `nethack-c/upstream/dat/quest.lua`: role-specific `guardtalk_before` and `guardtalk_after` arrays for the supported embedded JS quest roles.

## JS Status

- `questPagerText()` now supports array-valued quest messages and uses the C-shaped single RNG call for array selection.
- The guardian `qt_pager()` path bypasses the existing pager-side `l_nhcore_init()` compatibility call, so guardian speech only consumes the C-shaped array-selection RNG.
- Added `guardtalk_before` and `guardtalk_after` arrays for the quest roles already represented in `QUEST_ROLE_DATA`: Archeologist, Barbarian, Knight, Priest, and Wizard.
- `tipHatMonsterNoise()` now handles the player's own role `MS_GUARDIAN` via quest guardian pager text.
- `MS_GUARDIAN` monsters that are not the current role guardian fall back to ordinary humanoid speech instead of using the player's guardian text.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `chat with visible role quest guardian uses guardtalk_before pager text`
- `worn helmet tip with invisible role quest guardian uses guardtalk_before pager text`
- `chat with quest guardian after nemesis uses guardtalk_after pager text`
- `chat with another role guardian falls back to humanoid speech`

These tests assert direct `#chat` and directed helmet `#tip` behavior, wait-strategy clearing, invisible mapping through the existing helper, and the expected `rn2(5)` pager-array RNG shape.

## Remaining Gaps

- `QUEST_ROLE_DATA` is still an embedded quest-text subset rather than generated from upstream `dat/quest.lua`.
- `MS_LEADER` and `MS_NEMESIS` quest speech remain separate follow-up slices.
- Full C fallback through `genus(monsndx(ptr), 1).msound` is approximated here as humanoid speech for non-role guardians.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "quest guardian|MS_GUARDIAN|guardtalk" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44` replay sessions passed)
- `git diff --check`
