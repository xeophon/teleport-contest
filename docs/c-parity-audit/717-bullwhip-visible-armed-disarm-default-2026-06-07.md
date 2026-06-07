# 717 - Bullwhip Visible Armed Disarm Default

## C Source

- `nethack-c/upstream/src/apply.c:2990-3003` computes `use_whip()`'s fake proficiency from Archeologist role, Dexterity, and Fumbling, then clamps it to `0..3`.
- `nethack-c/upstream/src/apply.c:3127-3151` enters the monster branch after pit handling; only visible monsters use `MON_WEP(mtmp)` for a disarm attempt.
- `nethack-c/upstream/src/apply.c:3153-3167` wraps the bullwhip around the wielded weapon. If `gotit` is false, C keeps the monster weapon wielded and prints `The bullwhip slips free.`
- `nethack-c/upstream/src/apply.c:3174-3180` extracts a successful non-welded weapon, unwields it, marks it not wielded, and consumes `rn2(proficient + 1)`.
- `nethack-c/upstream/src/apply.c:3233-3240` handles the default `rn2()` result by yanking the weapon from the monster's hand, placing the same object at the monster square, and stacking it.
- `nethack-c/upstream/src/apply.c:3260-3261` wakes and angers the target regardless of whether the disarm succeeds.

## Port Notes

- JS now computes the same fake bullwhip proficiency for hero bullwhip use.
- Visible armed monsters use `mon.mw` as the `MON_WEP()` equivalent; random inventory items are not inferred as wielded.
- Unproficient hero bullwhip use against a visible armed monster wraps the weapon, prints `The bullwhip slips free.`, spends the turn, and wakes/angers the target without changing monster inventory.
- Proficiency-1 bullwhip use consumes `rn2(2)`, moves the actual `mon.mw` object out of `minvent` to the monster square, clears stale wield/carrier fields, sets `weapon_check = NEED_WEAPON`, stacks the object, redraws the square, and wakes/angers the target.
- Higher proficiency is intentionally not claimed here because C's `rn2(3)`/`rn2(4)` destination variants can yank to the hero square or snatch into inventory.

## Tests

- `wielded bullwhip around visible armed monster slips free when unproficient`
- `wielded bullwhip yanks visible armed monster weapon to monster square when proficient`
- Existing audit 704 and 716 bullwhip canaries were rerun with the focused bullwhip pattern.

## Remaining Follow-Ups

- Higher-proficiency disarm destinations: roll `2` yanks the weapon to the hero's floor square, roll `3` snatches it into inventory with full carried-object side effects.
- Welded monster weapons need the C `It is welded to <monster>'s hand!` feedback and `bknown` update before slipping free.
- Full disarm side effects still need shop billing/no-charge, timers/light sources, artifact/object immunities, petrifying corpse snatch handling, inventory overflow, and exact monster body-part naming beyond ordinary hands.
- Broader `use_whip()` follow-ups remain mimic reveal, invisible mapping, pit escape, fumbling/glib drops, proficient `force_attack()`, floor snaring, dead-horse feedback, and exact wakeup visibility.
