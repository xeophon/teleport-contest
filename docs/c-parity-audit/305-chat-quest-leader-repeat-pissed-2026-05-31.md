# 305 - Chat Quest Leader Repeat Pissed

## C anchors

- `nethack-c/upstream/src/sounds.c:1388`: direct `#chat` clears the target monster's wait strategy before speech.
- `nethack-c/upstream/src/sounds.c:1408`: direct monster chat calls `domonnoise()`.
- `nethack-c/upstream/src/sounds.c:695`: the actual quest leader is remapped to `MS_LEADER`.
- `nethack-c/upstream/src/sounds.c:728`: quest speakers dispatch to `quest_chat()`.
- `nethack-c/upstream/src/sounds.c:1241`: `domonnoise()` returns `ECMD_TIME`, so direct chat consumes a turn even when no text is printed.
- `nethack-c/upstream/src/quest.c:284`: `chat_with_leader()` returns immediately when `Qstat(pissed_off)` is already true.
- `nethack-c/upstream/src/quest.c:475`: `quest_chat()` calls `chat_with_leader()`.
- `nethack-c/upstream/src/quest.c:477`: after the early return, `quest_chat()` still calls `setmangry()` for a pissed leader.
- `nethack-c/upstream/src/mon.c:4287`: `setmangry()` returns silently for an already non-peaceful monster.

## JS changes

- Direct quest leader chat now short-circuits before `leader_first`/`leader_next` when `quest_status.pissed_off` is already true.
- The direct path clears pending pager state, makes the leader hostile, consumes the chat turn, and returns without showing `banished` again.
- Automatic leader handling is left outside this direct-chat slice because C's `leader_speaks()` has different ordering.

## Focused tests

- `already-pissed quest leader chat silently angers without rebanishing`
- `already-pissed peaceful quest leader chat turns hostile without pager`
- `already-pissed converted leader intro helper is bypassed by direct chat`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "already-pissed quest leader|already-pissed peaceful quest leader|already-pissed converted leader intro helper|converted quest leader rejection uses banished|temporary opposite alignment quest leader rejection|off-start quest leader chat stops|repeat off-start quest leader chat" test/shop-billing-helpers.test.mjs`

## Remaining gaps

- Automatic `leader_speaks()` pissed-off behavior is still separate from direct `#chat`.
- `got_thanks` follow-up messages and quest artifact return remain separate leader-chat slices.
