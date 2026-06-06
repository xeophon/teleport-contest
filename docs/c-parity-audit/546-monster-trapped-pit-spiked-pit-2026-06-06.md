# Monster Trapped Pit And Spiked Pit

## Scope

Port the C `mintrap()` branch for monsters and pets that are already `mtrapped` in `PIT` or `SPIKED_PIT`. This covers trapped escape RNG, easy pit escape, visible escape messages, boulder fill through the existing floor-effects helper, and metallivore spiked-pit spike eating.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3739` through `:3789` covers the already-trapped `mintrap()` branch before `trapeffect_selector()`.
- `nethack-c/upstream/src/trap.c:3724` through `:3730` defines easy pit escape for pit fiends and huge monsters.
- `nethack-c/upstream/src/trap.c:3751` through `:3760` covers the `rn2(40)` escape gate, optional `rn2(2)` boulder-fill gate, `"pulls free..."` message, and `fill_pit()` call.
- `nethack-c/upstream/src/trap.c:3761` through `:3772` covers normal visible `"climbs [easily ]out of the pit."` escape.
- `nethack-c/upstream/src/trap.c:3773` through `:3787` covers metallivore trapped `SPIKED_PIT` spike eating, conversion to `PIT`, and `meating = 5`.
- `nethack-c/upstream/src/trap.c:4008` through `:4019` and `nethack-c/upstream/src/do.c:187` through `:269` cover boulder pit filling through `flooreffects(..., "settle")`.
- `nethack-c/upstream/src/monmove.c:1733` through `:1743` and `:1771` through `:1774` show that already-trapped monsters run this branch before pet-specific `dog_move()`.

## JS Change

- `js/allmain.js` adds `monsterTrappedTrapTurn()` for the already-trapped `PIT`/`SPIKED_PIT` branch.
- Ordinary monster and pet trapped preludes now call the shared helper before falling back to the older non-pit trapped handling.
- Failed pit escape leaves the monster caught without damage or first-entry pit re-triggering.
- Pit fiends and huge monsters still consume the `rn2(40)` roll but escape via the easy escape branch.
- Boulder-assisted escape now consumes the `rn2(2)` fill gate, clears `mtrapped` before floor effects, removes the boulder, and deletes the filled pit through `earthFloorEffects()`.
- Metallivorous monsters that fail escape in a spiked pit now munch the spikes, convert the trap to ordinary `PIT`, set `meating = 5`, and remain trapped.

## Tests

- `already-trapped monster pit escape failure stays caught without damage`
- `already-trapped monster climbs out of visible pit without re-trigger damage`
- `easy pit escape monster still consumes escape roll before climbing out`
- `already-trapped monster can pull free and fill pit with boulder`
- `metallivorous trapped monster eats spiked pit spikes only after failed escape`
- `monster turn trapped pit failure spends turn without pit damage`
- `pet turn trapped pit failure stays caught without same-square re-trigger`

The tests use local monster, pet, trap, boulder, visibility, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Already-trapped bear trap and web escape/eating behavior is covered by audit 547.
- Full external boulder-combat damage and hero-credit behavior remains owned by the broader floor-effects/projectile paths.
- `mselftouch()` from falling with a wielded cockatrice/chickatrice corpse remains unmodeled for first-entry pit handling.
- Ceiling-clinger and long-worm segment handling for non-grounded pit avoidance remains deferred.
