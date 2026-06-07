# 732 - Ready Wielded Weapon Confirmation

## C Source

- `nethack-c/upstream/src/wield.c:568-610` handles selecting the primary wielded weapon in `doquiver_core()`: welded weapons block readiness, wielded stacks can split all but one into the quiver, and whole-weapon readiness requires confirmation.
- `nethack-c/upstream/src/wield.c:611-650` handles alternate and live second weapons with the same split/all confirmation shape and disables active two-weapon combat when the live second weapon is readied.
- `nethack-c/upstream/src/wield.c:652-663` prints ordinary `ready` feedback after assigning `uquiver`, but prints `You ready:` before assigning `uquiver` for manual `fire`.
- `nethack-c/upstream/src/wield.c:665-678` makes quiver manipulation free except when the primary weapon is unwielded or active two-weapon combat is stopped.
- `nethack-c/upstream/src/dothrow.c:582-585` preserves that `ECMD_TIME` result from manual `fire` even if the later throw direction is cancelled.

## Port Notes

- `Q` and manual `f` now route primary, inactive alternate, and live left-hand selections through one confirmation state.
- Primary readiness confirmation clears wield state, disables two-weapon combat, readies the item, and charges one move.
- Active left-hand readiness confirmation clears the alternate/live-left-hand state, disables two-weapon combat, readies the item, and charges one move.
- Inactive alternate readiness still clears the alternate slot and readies the item without a move.
- Wielded stacks without a typed selection count now ask to ready all but one first; accepting splits the carried stack, leaves one item wielded or alternated, readies the split child, and does not consume time.
- Manual `f` includes the unwield/two-weapon fallout in the `You ready:` More message and keeps the ready-time marker for the following direction prompt.
- Escape at the following `fire` direction prompt now cancels the throw without undoing the already-readied object.

## Tests

- `Q command declining primary wielded weapon keeps it wielded`
- `Q command confirming primary wielded weapon unwields and readies it with time`
- `f command confirming primary wielded weapon preserves ready time before direction cancel`
- `Q command confirming live left-hand weapon stops two-weapon combat with time`
- `Q command accepting wielded stack split leaves one wielded and readies the rest`

## Remaining Follow-Ups

- Welded primary-weapon readiness still needs exact `weldmsg()` and unknown-curse time behavior.
- The secondary stack all-instead decline path is covered by the shared state machine but not yet pinned by a dedicated canary.
- Ready-menu count editing still does not mirror every C `get_count()` editing key.
