# Box `#untrap` Known-Trap Forced Flow

## Scope

Port the C two-step prompt flow for a box/chest whose trap is already known and observed. Accepting `Disarm this <box>?` should run the forced box trap check, print the known-trap message, and ask `Disarm it?` before the actual disarm or decline response consumes the turn.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:6004` through `:6012` asks `Disarm this <box>?` for `tknown && dknown`, then calls `untrap_box(box, TRUE, FALSE)` on `y`.
- `nethack-c/upstream/src/trap.c:5826` through `:5838` has forced `untrap_box()` report the trap, observe the object, exercise Wisdom, and ask `Disarm it?`.
- `nethack-c/upstream/src/trap.c:5839` through `:5840` calls `disarm_box()` only after the second prompt is accepted.

## JS Change

- `js/cmd.js` now supports a forced box check path in `checkUntrapBox()`.
- Accepting the first known-box `Disarm this...` prompt now enters `untrapBoxDisarmConfirm` instead of immediately calling `disarmUntrapBox()`.
- Turn consumption remains attached to the second `Disarm it?` response, matching the asynchronous command flow.

## Tests

- `#untrap failed known-box disarm consumes the one-shot trap`
- `#untrap known-box forced disarm decline consumes turn without triggering trap`

These tests drive the real extended command input, assert the two-prompt known-trap flow, verify the Wisdom exercise RNG before disarm/decline, and cover both accepted failed disarm and declined second-prompt outcomes.

## Remaining Work

- Full `chest_trap()` payload effects are still partial and tracked from `565-untrap-box-one-shot-failure-2026-06-06.md`.
