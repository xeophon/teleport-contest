# 724 - Bullwhip Unseen Target Reveal

## C Source

- `nethack-c/upstream/include/display.h:117-129` defines `canspotmon(mon)` as visual `canseemon(mon)` or sensing via `sensemon(mon)`.
- `nethack-c/upstream/src/apply.c:3127-3146` enters `whipattack`, clears `otmp`, and handles monsters that are present but not currently `canspotmon()`.
- `nethack-c/upstream/src/apply.c:3133-3146` clears `mundetected`, rechecks visibility, prints `%s is there that you %s.`, then either calls `map_invisible(rx, ry)` or `newsym(rx, ry)`.
- `nethack-c/upstream/src/apply.c:3147-3151` only sets `otmp = MON_WEP(mtmp)` when the monster was already visible at the start of the branch, so a newly revealed hidden armed monster is not disarmed on the same action.
- `nethack-c/upstream/src/apply.c:3245-3258` handles the no-weapon/direct-attack path. Concealed mimics call `stumble_onto_mimic(mtmp)` and suppress `Snap!`; ordinary direct attacks print `You flick your bullwhip towards %s.` and then `Snap!` unless a proficient `force_attack()` consumes the turn.
- `nethack-c/upstream/src/apply.c:3260-3261` wakes/angers the target after monster weapon or direct-attack handling, unless the proficient `force_attack()` path returned early.

## Port Notes

- Bullwhip monster handling now has a `canspotmon()`-style helper that includes visual sight plus sensing/detection.
- Hidden armed monsters are revealed before direct attack and do not enter the disarm path on that same bullwhip action.
- Already-sensed invisible armed monsters take the C known-monster disarm path without the unseen discovery message.
- Invisible unseen monsters now print the C discovery wording and mark the target square with an invisible glyph marker before snapping at `it`.
- Disguised mimics in the direct-attack path now reveal with `Wait!  That's ...!` and suppress both the ordinary flick message and `Snap!`.
- Existing wake/anger side effects still run through the shared JS monster-hit helper after these no-weapon paths.

## Tests

- `wielded bullwhip reveals hidden armed monster without disarming it`
- `wielded bullwhip maps invisible unseen monster before snapping at it`
- `wielded bullwhip can disarm telepathically sensed invisible monster`
- `wielded bullwhip reveals disguised mimic without snap`
- Existing visible armed/disarmed and ordinary no-target bullwhip tests were rerun.

## Remaining Follow-Ups

- Full `force_attack(mtmp, FALSE)` direct-attack parity remains future work, including melee hit RNG, damage, passive effects, and the early return that skips later `wakeup()`.
- Full `stumble_onto_mimic()` parity remains broader than this slice: sticky mimic grabs, alternate reveal message variants, light recalculation, and invisible revealed mimic mapping.
- Full `wakeup(mtmp, TRUE)` side effects remain approximated: mimic reveal details, shopkeeper/priest/quest consequences, alignment penalties, growl messages, and wait-strategy fallout are not complete here.
