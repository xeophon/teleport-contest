# 713 - Snickersnee Polearm Distance Turn

## C Source

- `nethack-c/upstream/include/obj.h:227` includes `ART_SNICKERSNEE` in `is_pole()`, making Snickersnee usable for distance attacks even though it is not an ordinary polearm.
- `nethack-c/upstream/include/context.h:157` stores the last Snickersnee distance turn in `svc.context.snickersnee_turn`.
- `nethack-c/upstream/src/apply.c:3414-3422` checks whether wielded Snickersnee has already attacked at distance on the current move.
- `nethack-c/upstream/src/apply.c:3492-3505` runs `attack_checks()` and `overexertion()` before rejecting a second same-turn Snickersnee distance attack with `The blade doesn't reach there!`.
- `nethack-c/upstream/src/apply.c:3511-3518` records the current move, marks the first same-turn use as a free hit, and prints `Shkinng!` when the hero is not deaf.
- `nethack-c/upstream/src/apply.c:3521` then calls `thitmonst()`, and `nethack-c/upstream/src/apply.c:3561-3562` still wipes the hero's engraving before returning no time for the free hit.

## Port Notes

- JS now records Snickersnee distance use in `game.context.snickersnee_turn`, matching C's durable context field.
- A second same-turn Snickersnee distance attack now fails after polearm attack checks but before hit RNG, damage, passive object effects, time charge, or engraving wipe.
- The first valid Snickersnee distance attack on a turn prepends `Shkinng!`, runs the normal applied-polearm impact, wipes the hero-square engraving, and leaves `game.context.move` at zero.
- Ordinary polearms keep the existing charged distance-hit behavior.

## Tests

- `applying Snickersnee distance attack is free once per turn`

## Remaining Follow-Ups

- Full `use_pole()` impact parity still needs worm cutting and exact `tmiss()`/wakeup messaging.
