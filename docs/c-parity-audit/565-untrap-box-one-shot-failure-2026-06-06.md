# Box `#untrap` Failed Disarm One-Shot Trap State

## Scope

Port the C state transition for a failed `#untrap` box/chest disarm: after the hero sets off a known trapped box or chest, the trap is consumed and the container's trap-known bit is restored.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:5796` through `:5816` has `disarm_box()` call `chest_trap(box, FINGER, TRUE)` on failed disarm.
- `nethack-c/upstream/src/trap.c:6294` through `:6338` clears `obj->otrapped = 0` before applying `chest_trap()` effects.
- `nethack-c/upstream/src/trap.c:6504` through `:6506` restores `obj->tknown = 1` for the non-destroyed container before returning.

## JS Change

- `js/cmd.js` now clears `box.otrapped` and sets `box.tknown` when `disarmUntrapBox()` fails and returns `You set it off!`.
- The existing Dexterity exercise is preserved, including its `rn2(19)` RNG call.

## Tests

- `#untrap failed known-box disarm consumes the one-shot trap`

This test drives the real extended command input, accepts the disarm prompt, forces the failed disarm roll, asserts the Dexterity exercise RNG call, and verifies the one-shot trap state after the failure message.

## Remaining Work

- Full `chest_trap()` effects are still partial: explosion/destruction, damage, paralysis, sleep gas, poison gas, and shop billing consequences are not covered by this slice.
