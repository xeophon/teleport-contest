# Box `#untrap` Failed Disarm One-Shot Trap State

## Scope

Port the C state transition for a failed non-forced `#untrap` box/chest disarm: after the hero finds a trapped box or chest and then sets it off while trying to disarm it, the trap is consumed and the container's trap-known bit is restored.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:5796` through `:5816` has `disarm_box()` call `chest_trap(box, FINGER, TRUE)` on failed non-forced disarm.
- `nethack-c/upstream/src/trap.c:6294` through `:6338` clears `obj->otrapped = 0` before applying `chest_trap()` effects.
- `nethack-c/upstream/src/trap.c:6504` through `:6506` restores `obj->tknown = 1` for the non-destroyed container before returning.

## JS Change

- `js/cmd.js` now clears `box.otrapped` and sets `box.tknown` when `disarmUntrapBox()` fails and returns `You set it off!`.
- The existing Dexterity exercise is preserved, including its `rn2(19)` RNG call.

## Tests

- `#untrap discovered box disarm failure consumes the one-shot trap`

This test drives the real extended command input, finds the trap, accepts the subsequent `Disarm it?` prompt, forces the failed disarm roll, asserts the Wisdom and Dexterity exercise RNG calls, and verifies the one-shot trap state after the failure message.

## Remaining Work

- Box/chest trap detection observation state is covered separately in `566-untrap-box-observation-2026-06-06.md`.
- Box/chest known-trap direct disarm flow is covered separately in `568-untrap-box-known-direct-disarm-2026-06-06.md`.
- The `chest_trap()` paralysis payload is now covered for failed `#untrap` box/chest disarm, including the C luck gate, payload selector, helpless duration, free-action bypass, and DEX exercise ordering.
- Full `chest_trap()` effects are still partial: explosion/destruction, damage, sleep gas, poison gas, and shop billing consequences are not covered by this slice.
