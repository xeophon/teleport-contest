# Pet Pit And Spiked Pit Effect

## Scope

Route tame pet `PIT` and `SPIKED_PIT` post-move trap handling through the same C-shaped new-trigger path used by ordinary monsters. This covers in-air avoidance, Sokoban drag-in, pass-wall trap state, visible fall messaging, iron-footwear spike protection, damage rolls, and fatal trap cleanup from the pet movement path.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3733` through `:3825` is the shared `mintrap()` path for monsters, including tame monsters, known-trap avoidance, learning, and in-air floor-trigger skip.
- `nethack-c/upstream/src/trap.c:1966` through `:2007` is the shared monster `trapeffect_pit()` body for `PIT` and `SPIKED_PIT`.
- `nethack-c/upstream/src/trap.c:1974` through `:1988` covers non-grounded monster avoidance and the Sokoban "is dragged" wording.
- `nethack-c/upstream/src/trap.c:1989` through `:1990` sets `mtrapped` only for non-wall-passing monsters.
- `nethack-c/upstream/src/trap.c:2001` through `:2003` downgrades spiked-pit damage to ordinary pit damage when the monster has iron footwear.

## JS Change

- `js/allmain.js` removes the older inline pet `PIT`/`SPIKED_PIT` branch.
- Pet post-move pit handling now calls `monsterPitTrapEffect(mon, trap, { skipPetPostMoveRoll: true })`.
- Flying/floating pets can move over ordinary non-Sokoban pits without learning the trap or taking damage.
- Sokoban non-hero pits drag flying/floating pets in and still apply pit damage and trap state.
- Pass-wall pets take pit/spiked-pit damage without becoming `mtrapped`.
- Pet spiked-pit damage now honors worn iron footwear and uses the ordinary `rnd(6)` pit damage roll when spikes are not relevant.
- Lethal pet pit damage still skips the pet post-move roll through the existing trap-kill finalizer option.

## Tests

- `pet pit trap movement traps and damages pet visibly`
- `flying pet avoids ordinary pit trap without learning or damage`
- `sokoban pit drags flying pet into trap`
- `grounded pet spiked pit trap uses spike damage roll`
- `pass-wall pet takes spiked pit damage without becoming trapped`
- `pet iron shoes reduce spiked pit trap damage to ordinary pit damage`
- `pet pit trap death removes pet and clears trapped state`

The tests use local pet, trap, armor, visibility, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Already-trapped pet pit escape, boulder fill, and metallivore spiked-pit eating for `PIT`/`SPIKED_PIT` are covered by audit 546.
- `mselftouch()` from falling with a wielded cockatrice/chickatrice corpse remains unmodeled for pets and ordinary monsters.
- Ceiling-clinger and long-worm segment handling for non-grounded pit avoidance remains deferred.
