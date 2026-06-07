# 718 - Bullwhip High-Proficiency Disarm Destinations

## C Source

- `nethack-c/upstream/src/apply.c:3174-3180` extracts the monster's wielded object, clears monster wield state, and consumes `rn2(proficient + 1)` after a successful visible-monster bullwhip disarm.
- `nethack-c/upstream/src/apply.c:3180-3186` handles roll `2`: `You yank <weapon> to the <surface>!`, then places and stacks the same object at the hero square.
- `nethack-c/upstream/src/apply.c:3187-3231` handles roll `3`: `You snatch <weapon>!`, performs the petrifying-corpse fatal touch check, then calls `hold_another_object(otmp, "You drop %s!", doname(otmp), NULL)`.
- `nethack-c/upstream/src/apply.c:3233-3240` remains the default monster-square placement for all other roll values.
- `nethack-c/upstream/src/apply.c:3260-3261` wakes and angers the target after every visible-monster weapon branch.

## Port Notes

- The JS visible armed-monster disarm gate now allows all nonzero fake proficiency values instead of restricting the branch to proficiency `0..1`.
- Successful non-fumbling disarms still remove the actual `mon.mw` object from `mon.minvent`, clear monster wield state, set `weapon_check = NEED_WEAPON`, and clear stale carried/wielded/floor-link fields before choosing a destination.
- Roll `2` now places the same weapon object at the hero square, stacks it there, redraws the hero square, and prints the C-shaped `You yank <weapon> to the floor!` message for ordinary room floor.
- Roll `3` now snatches the same weapon object into hero inventory using the local inventory merge/letter helpers, then prints the assigned inventory line like C `hold_another_object()`/`prinv()`. If inventory letters are full and no merge is possible, it drops the same object at the hero square and appends `You drop <weapon>!`, matching the `hold_another_object()` fallback shape.
- The new canaries use explicit core RNG queues for the target roll values; they do not use replay maps, seed-derived branch hunting, hidden tests, player names, or runtime shortcuts.

## Tests

- `wielded bullwhip can yank visible armed monster weapon to hero square`
- `wielded bullwhip can snatch visible armed monster weapon into inventory`
- `wielded bullwhip snatch drops monster weapon when inventory letters are full`
- Existing audit 704, 716, and 717 bullwhip canaries were rerun with the focused bullwhip pattern.

## Remaining Follow-Ups

- Welded monster weapons still need the C `It is welded to <monster>'s hand!` feedback and `bknown` update before slipping free.
- The roll `3` petrifying corpse branch remains deferred because the current JS `MON_WEP()` analogue only accepts weapon-class wielded objects.
- Broader side effects still need exact shop billing/no-charge, timers/light-source shutdown, artifact/object immunities, exact body-part naming beyond ordinary hands, mimic reveal, invisible mapping, pit escape, fumbling/glib drops, proficient `force_attack()`, floor snaring, dead-horse feedback, and exact wakeup visibility.
