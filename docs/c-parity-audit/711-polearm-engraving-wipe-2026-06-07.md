# 711 - Polearm Engraving Wipe

## C Source

- `nethack-c/upstream/src/apply.c:3489-3521` routes resolved monster polearm targets through `attack_checks()` and `thitmonst()` before reaching the shared tail of `use_pole()`.
- `nethack-c/upstream/src/apply.c:3538-3558` routes statue, boulder, obstacle, and empty-square polearm outcomes through the same shared tail.
- `nethack-c/upstream/src/apply.c:3561` calls `u_wipe_engr(2)` after resolved polearm target handling, but not after range, visibility, reach, confirmation-decline, attack-check abort, or same-turn Snickersnee reach failures.
- `nethack-c/upstream/src/engrave.c:264-280` makes `u_wipe_engr()` act on the hero square only when the hero can reach the floor, with dust and blood engravings eroded directly.

## Port Notes

- JS polearm target resolution now wipes the engraving under the hero after monster impact, statue thumps or traps, boulder thumps, obstacle feedback, and empty-target feedback.
- Validation failures still return before the wipe, preserving C behavior for too-far, too-close, cannot-see, and cannot-reach outcomes.
- The wipe uses the existing `wipe_engr_at()` implementation and a reach-floor guard, so levitation, swallowing, and other existing reach restrictions avoid eroding floor text.

## Tests

- `applying polearm wipes dust engraving under hero after impact`
- `applying basic polearm too far preserves dust engraving under hero`
- `f command empty quiver stale polearm marker wipes dust engraving under hero`

## Remaining Follow-Ups

- Full `use_pole()` impact parity still needs other artifact-specific behavior. Audit 712 covers passive object effects; audit 713 covers Snickersnee distance timing; audit 714 covers `tmiss()` wakeup ordering; audit 715 covers long-worm cutting.
