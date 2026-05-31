# 304 - Chat Quest Leader Banished and Off-Start

## C anchors

- `nethack-c/upstream/src/sounds.c:1388`: direct `#chat` clears the target monster's wait strategy before speech.
- `nethack-c/upstream/src/sounds.c:1408`: direct monster chat calls `domonnoise()` and consumes a turn when speech succeeds.
- `nethack-c/upstream/src/sounds.c:695`: the actual quest leader is treated as `MS_LEADER`.
- `nethack-c/upstream/src/sounds.c:728`: quest leaders, nemeses, and guardians dispatch through `quest_chat()`.
- `nethack-c/upstream/src/quest.c:321`: first leader chat shows `leader_first`, sets `met_leader`, and clears `not_ready`.
- `nethack-c/upstream/src/quest.c:330`: leader chat returns after the intro when the leader is off the quest start level.
- `nethack-c/upstream/src/quest.c:152`: `is_pure(TRUE)` checks current alignment, original alignment, and current alignment base.
- `nethack-c/upstream/src/quest.c:171`: purity is `1` only when record, current type, and current base all match the original alignment.
- `nethack-c/upstream/src/quest.c:175`: purity is `-1` only when the current alignment base no longer matches the original alignment.
- `nethack-c/upstream/src/quest.c:337`: converted leader chat enters the banished branch.
- `nethack-c/upstream/src/quest.c:339`: banishment uses `com_pager("banished")`.
- `nethack-c/upstream/src/quest.c:340`: banishment sets `Qstat(pissed_off)`.
- `nethack-c/upstream/src/quest.c:478`: `quest_chat()` makes the leader angry after `pissed_off` is set.
- `nethack-c/upstream/dat/quest.lua:92`: common `banished` text.

## JS changes

- Added common `banished` quest text with `%d` and `%H` substitutions.
- Direct leader chat now stores the leader across the intro More so the converted branch can mark that specific monster hostile.
- The continuation after `leader_first`/`leader_next` now stops immediately off the quest start level, consuming the chat turn without assignment, rejection, Wisdom exercise, or expulsion.
- First leader contact now clears `quest_status.not_ready`; repeat `leader_next` contact preserves it.
- Converted rejection now follows C's permanent conversion test: changed `ualignbase[A_CURRENT]` banishes, while temporary current-alignment mismatch remains the ordinary `badalign` rejection.
- Existing quest pager loading is preserved so role/common pager text keeps the C-shaped Lua loader RNG (`rn2(3)`, `rn2(2)`), while the banished branch adds no Wisdom exercise RNG.

## Focused tests

- `converted quest leader rejection uses banished pager without wisdom exercise`
- `temporary opposite alignment quest leader rejection uses badalign, not banished`
- `off-start quest leader chat stops after intro without assignment checks`
- `repeat off-start quest leader chat keeps not-ready marker after leader_next`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "converted quest leader rejection uses banished|temporary opposite alignment quest leader rejection|off-start quest leader chat stops|repeat off-start quest leader chat" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "quest leader|quest nemesis|quest guardian|guardtalk|banished|off-start|temporary opposite alignment|percent-t" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.test.mjs`
- `npm run score` (`44/44 passing`)

## Remaining gaps

- Already-pissed leader repeat behavior still needs a focused parity slice for the no-new-pager case.
- Leader artifact-return and `got_thanks` follow-up messages (`posthanks`, `offeredit`, `offeredit2`, `hasamulet`) remain unimplemented.
- Bribe offer resolution and paid Oracle consultation remain larger unresolved `domonnoise()` paths.
