# 710 - Polearm Invisible Marker Attack Checks

## C Source

- `nethack-c/upstream/src/apply.c:3279-3280` treats monster, invisible-marker, and statue glyphs as polearmable displayed targets.
- `nethack-c/upstream/src/apply.c:3292-3317` makes `find_poleable_mon()` succeed only for exactly one valid displayed target; invisible-marker squares participate in that scan.
- `nethack-c/upstream/src/apply.c:3320-3330` accepts a target square when it is in polearm range and either visible or remembered as a polearmable glyph through `couldsee()`.
- `nethack-c/upstream/src/apply.c:3489-3502` clears the prior hitmon and calls `attack_checks()` before recording the new polearm target or applying damage.
- `nethack-c/upstream/src/uhitm.c:230-251` maps an unseen real monster with `Wait!  There's something there you can't see!`, wakes/angers it, and aborts the attack.
- `nethack-c/upstream/src/uhitm.c:268-295` reveals hidden/eel targets; with an existing invisible marker the attack proceeds, otherwise the hidden-monster discovery message aborts.
- `nethack-c/upstream/src/apply.c:3538-3562` unmaps stale invisible markers before empty-square feedback.

## Port Notes

- Polearm autohit now scans nearby invisible-marker coordinates, de-duplicates candidates by location, preserves the exact-one rule, and still falls back to prior hitmon only when the fresh scan is not unique.
- Stale invisible markers can be selected by `f` polearm autohit and are cleared through the existing empty-target feedback path.
- Real unseen monsters without an existing marker now trigger a polearm-local `attack_checks()` branch: map `I`, wake/anger/reveal as needed, consume time, and do not roll damage.
- Real monsters under an existing invisible marker can proceed to the polearm hit path; hidden hiders are unhidden first.
- Polearm target preview and polearm hit wording no longer expose the actual monster name for unspotted marker targets.

## Tests

- `f command empty quiver auto-targets stale remembered invisible polearm marker`
- `f command empty quiver auto-targets remembered invisible monster marker`
- `applying polearm to unseen monster maps invisible and aborts attack`
- `applying polearm to remembered invisible marker over monster proceeds to hit`
- `applying polearm to hidden hider under remembered invisible marker proceeds to hit`

## Remaining Follow-Ups

- Exact hidden mimic stumble wording, warning-glyph edge cases, and object-specific hidden-under messages can still be broadened.
- Full `use_pole()` impact parity still needs other artifact-specific behavior. Audit 711 covers engraving wiping; audit 712 covers passive object effects; audit 713 covers Snickersnee distance timing; audit 714 covers `tmiss()` wakeup ordering; audit 715 covers long-worm cutting.
