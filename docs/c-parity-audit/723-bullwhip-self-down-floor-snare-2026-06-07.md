# 723 - Bullwhip Self/Down Floor Snare

## C Source

- `nethack-c/upstream/src/apply.c:3020-3063` handles self-targeted or downward bullwhip use before the later Fumbling/Glib hand-slip branch.
- `nethack-c/upstream/src/apply.c:3023-3027` can hit a mounted steed first with `!rn2(proficient + 2)`, then calls `kick_steed()`.
- `nethack-c/upstream/src/apply.c:3029-3035` makes same-square pool/lava or water/lava-wall targets splash; same-square lava calls `fire_damage(uwep, FALSE, u.ux, u.uy)`.
- `nethack-c/upstream/src/apply.c:3037-3055` lets levitating, mounted, or flying heroes interact with the top floor object: horse/warhorse/pony corpses print `Why beat a dead horse?`; proficient heroes wrap the object and only attempt `pickup_object(otmp, 1L, TRUE)` when `rnl(6) == 0`.
- `nethack-c/upstream/src/apply.c:3057-3062` otherwise hits the hero's foot for `rnd(2) + dbon() + obj->spe`, clamped to at least 1 and passed through `Maybe_Half_Phys()`.

## Port Notes

- Bullwhip direction handling now uses `commandDirection()`, making `<`, `>`, and `.` reachable for the apply prompt.
- The self/down branch now runs before Fumbling/Glib hand-slip behavior, matching the C return order.
- Same-square pool/lava splash, dead-horse feedback, ordinary foot damage, and ordinary top-floor object snaring are covered.
- Floor snaring uses the existing top-floor lookup, split-one-item helper, inventory merge helper, inventory-letter allocation, line formatting, carried figurine timer hook, and corpse ice timer hook.
- The floor snare success gate uses `rnl(6)`, not `rn2(6)`.

## Tests

- `wielded bullwhip upward flicks a ceiling bug`
- `wielded bullwhip at self hits foot`
- `fumbling wielded bullwhip down hits foot before hand slip check`
- `wielded bullwhip down while flying over pool splashes before floor snare`
- `wielded bullwhip down at horse corpse asks why beat dead horse`
- `proficient wielded bullwhip down can snare floor object while flying`
- `proficient wielded bullwhip floor snare can slip free`

## Remaining Follow-Ups

- `kick_steed()` is only approximated for the bullwhip mistake path; full wake/thaw messages, dismount throws, leash fallout, riding skill exercise, and gallop-turn RNG remain future work.
- Full `pickup_object(..., TRUE)` side effects remain broader than this slice: shop billing, artifacts, Rider corpse revival, scare-monster dusting, gold absorption, container edge cases, and all inventory-full fallout.
- Same-square lava reuses the current JS passive fire-damage approximation, which is still narrower than C `fire_damage()` deletion and erosion behavior.
