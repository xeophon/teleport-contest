# Box `#untrap` Known-Trap Direct Disarm

## Scope

Port the C current-square flow for a box/chest whose trap state is already known and observed. Accepting `Disarm this <box>?` should call the direct disarm path immediately; it should not run `untrap_box()` and should not ask a second `Disarm it?` prompt.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:6004` through `:6015` asks `Disarm this <box>?` for `tknown && dknown`, then calls `disarm_box(otmp, force, confused)` directly on `y`.
- `nethack-c/upstream/src/trap.c:5796` through `:5816` handles direct disarm, including failure for non-forced `#untrap` and stale known-trap cleanup for untrapped boxes.
- `nethack-c/upstream/src/trap.c:5821` through `:5847` is only used for boxes whose trap state is not already known and observed.

## JS Change

- `js/cmd.js` now routes `tknown && dknown` current-square boxes directly to `disarmUntrapBox()`.
- Direct known-box disarm consumes the turn immediately after accepting `Disarm this...`.
- Known but untrapped boxes now use the direct `That <box> was not trapped.` stale-knowledge cleanup without an intermediate trap-check prompt.

## Tests

- `#untrap known-box disarm failure happens directly without second prompt`
- `#untrap known untrapped box clears stale trap knowledge directly`

These tests drive the real extended command input, assert there is no second `Disarm it?` prompt, cover direct failed disarm RNG/state, and cover stale `tknown` cleanup for an untrapped box.

## Remaining Work

- Full `chest_trap()` payload effects are still partial and tracked from `565-untrap-box-one-shot-failure-2026-06-06.md`.
