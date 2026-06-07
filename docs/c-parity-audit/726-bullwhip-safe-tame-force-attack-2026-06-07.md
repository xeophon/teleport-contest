# 726 - Bullwhip Safe Tame Force Attack

## C Source

- `nethack-c/upstream/src/apply.c:3245-3261` handles no-weapon bullwhip targets: print the flick or mimic reveal, call `force_attack(mtmp, FALSE)` for proficient users, and only print `Snap!` plus outer `wakeup(mtmp, TRUE)` when the force attack did not consume the turn.
- `nethack-c/upstream/src/uhitm.c:431-443` keeps `forcefight` disabled for tame monsters when `pets_too` is false.
- `nethack-c/upstream/src/uhitm.c:462-509` lets safe tame/peaceful monsters stop the action on the `!rn2(7)` branch, or evade the attack so callers can continue their own fallback.
- `nethack-c/upstream/include/display.h:154-161` defines `is_safemon()` as `safe_dog`, peaceful, spotted, and not confused/hallucinating/stunned.

## Port Notes

- Proficient bullwhip use against safe tame targets now enters a C-shaped safe-target force-attempt branch instead of skipping `force_attack()` entirely.
- On the stop branch, JS preserves the bullwhip flick prefix, applies tame flee state with the C `rnd(6)` timing roll, prints `You stop.  Your <pet> is in the way!`, consumes time, and suppresses `Snap!`.
- On the evade branch, JS preserves the no-attack bullwhip fallback: no pet swap, no melee damage, then the ordinary `Snap!` and wake tail.
- Non-tame proficient targets still use the existing normal-melee force path from audit 725.

## Tests

- `proficient wielded bullwhip can stop at safe tame target without snap`
- `proficient wielded bullwhip safe tame evade snaps without swapping`
- Existing proficient hostile and mimic force-attack tests were rerun with the focused bullwhip suite.

## Remaining Follow-Ups

- Full tame `do_attack()` parity remains broader than this slice: confirmation prompts when `safe_pet` is off or the hero is impaired, trapped-pet stop messages, shopkeeper payment detours, and non-tame peaceful details still belong in combat-core work.
- Fireassist queued swap/retry lifecycle remains a separate command-timing gap; see the 700-series fireassist notes.
