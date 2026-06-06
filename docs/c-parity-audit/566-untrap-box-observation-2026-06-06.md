# Box `#untrap` Trap Observation State

## Scope

Port the C object-observation state for a box/chest trap discovered by `#untrap`. This covers the non-payload detection path only: a real trapped box is found, the hero declines `Disarm it?`, and the trap remains armed but known and observed.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:5826` through `:5840` detects a box/chest trap, sets `box->tknown = 1`, calls `observe_object(box)`, exercises Wisdom when not confused, and prompts `Disarm it?`.
- `nethack-c/upstream/src/o_init.c:440` through `:446` has `observe_object()` set `obj->dknown = 1` when not hallucinating.
- `observe_object()` does not set `cknown`; the discovered trap does not imply contents knowledge.

## JS Change

- `js/cmd.js` now sets `box.dknown = true` when a non-hallucinating hero detects a box/chest trap through `#untrap`.
- The previous forced `box.cknown = true` side effect was removed.
- The existing Wisdom exercise and `Disarm it?` prompt flow are preserved.

## Tests

- `#untrap discovered box trap observes box without contents knowledge`

This test drives the real extended command input, forces the detection roll, asserts the Wisdom exercise RNG call, declines the disarm prompt, verifies the trap remains armed, and checks that the next `#untrap .` uses the direct known-trap disarm prompt.

## Remaining Work

- Box/chest known-trap detection fallback order is covered separately in `567-untrap-box-tknown-detection-fallback-2026-06-06.md`.
- Full `chest_trap()` payload effects are still partial and tracked from `565-untrap-box-one-shot-failure-2026-06-06.md`.
