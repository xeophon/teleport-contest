# 708 - Polearm Target Selection And Confirmation

## C Source

- `nethack-c/upstream/src/apply.c:3279-3280` defines polearmable displayed glyphs as monster, invisible-marker, or statue glyphs.
- `nethack-c/upstream/src/apply.c:3292-3312` implements `find_poleable_mon()`: confusion, stun, or hallucination are the impaired states; unimpaired scans skip tame monsters and peaceful monsters when `flags.confirm` is set; statues only count as automatic candidates while impaired; zero or multiple candidates fail.
- `nethack-c/upstream/src/apply.c:3471-3480` validates selected locations in C order: too far, too close, cannot see a non-polearmable displayed spot, then cannot reach.
- `nethack-c/upstream/src/apply.c:3492-3498` routes real monster polearm hits through `attack_checks()` before damage.
- `nethack-c/upstream/src/uhitm.c:308-321` asks `Really attack <monster>?` for spotted peaceful targets when confirmation is enabled and the hero is not confused, hallucinating, or stunned; declining aborts without consuming a turn.

## Port Notes

- Added a shared JS impaired-targeting helper for polearm auto-target selection.
- Normal polearm auto-targeting now skips tame targets and confirmation-protected peaceful targets, while impaired targeting can select them.
- Impaired auto-targeting can also select a unique visible statue and route it through the existing polearm thump/statue-trap path.
- Manual polearm final validation now follows C's `cansee` before `couldsee` failure split for non-polearmable displayed spots.
- Manual polearm attacks against spotted peaceful monsters now prompt for confirmation and abort without time or damage when declined.

## Tests

- `applying polearm to remembered unseen empty square says cannot see spot`
- `applying polearm to peaceful monster asks before attacking and no aborts`
- `applying polearm to peaceful monster attacks after confirmation`
- `f command empty quiver with peaceful polearm target skips autohit while unimpaired`
- `f command confused hero autohits peaceful polearm target`
- `f command hallucinating hero can polearm-target a statue`

## Remaining Follow-Ups

- Full `use_pole()` impact parity still needs worm cutting and exact miss/wakeup messages. Audit 711 covers engraving wiping; audit 712 covers passive object effects; audit 713 covers Snickersnee distance timing.
