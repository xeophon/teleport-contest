# 709 - Polearm Prior Hitmon Fallback

## C Source

- `nethack-c/upstream/src/apply.c:3395-3407` lets `could_pole_mon()` reuse `svc.context.polearm.hitmon` when the normal scan does not find exactly one polearmable target, provided the saved monster is live, sensed, and in the current polearm range.
- `nethack-c/upstream/src/apply.c:3457-3462` repeats the same fallback in `use_pole()` by replacing the default target coordinates with the saved monster's current coordinates.
- `nethack-c/upstream/src/apply.c:3489-3502` clears the remembered monster for each resolved polearm target and records the real target only after `attack_checks()` and overexertion allow the hit attempt.

## Port Notes

- Added transient JS polearm state for the last real polearm target, keyed by monster id when available and by live monster object membership otherwise.
- Polearm autohit selection now falls back to that remembered monster only when the fresh scan has zero or multiple candidates, and only if the monster is still live, sensed, allowed for autohit, and in current item range.
- Manual polearm resolution now clears the remembered monster before resolved target handling and records the new real monster immediately before the attack impact, matching C's post-check target recording point.

## Tests

- `f command empty quiver reuses prior polearm hit target amid ambiguity`
- `f command quivered ammo reuses prior polearm hit target before launcher amid ambiguity`

## Remaining Follow-Ups

- Invisible-marker auto-target selection and the hidden/unseen actual-monster `attack_checks()` discovery branch remain separate work.
- Full `use_pole()` impact parity still needs Snickersnee distance-attack limits, passive effects, worm cutting, exact miss/wakeup messages, and engraving wiping.
