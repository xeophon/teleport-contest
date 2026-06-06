# Box `#untrap` Known-Trap Detection Fallback

## Scope

Port the C detection order for a trapped box/chest whose trap is already known but whose object has not been observed. A failed real-trap search roll must still report the trap via `tknown`.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:5826` through `:5829` checks `(box->otrapped && search succeeds) || box->tknown || confused false-positive`.
- Because `box->tknown` is a separate disjunct, a known trapped box/chest still reports its trap after a failed search roll.
- `nethack-c/upstream/src/trap.c:5830` through `:5838` then uses the "find a trap" wording when `dknown` was still false, observes the object, and prompts `Disarm it?`.

## JS Change

- `js/cmd.js` no longer returns `false` immediately for trapped boxes whose search roll fails.
- `untrapBoxDetectionSucceeds()` now attempts the real-trap roll first and then falls through to the existing `tknown` check.

## Tests

- `#untrap known unobserved trapped box still reports trap after failed search roll`

This test drives the real extended command input, forces `rn2(30)=29` so the search roll fails, verifies that `tknown` still reports the trap, and confirms the observation state remains `dknown=true` and `cknown=false`.

## Remaining Work

- Full `chest_trap()` payload effects are still partial and tracked from `565-untrap-box-one-shot-failure-2026-06-06.md`.
