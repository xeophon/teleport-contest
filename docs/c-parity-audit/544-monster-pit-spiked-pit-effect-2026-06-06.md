# Monster Pit And Spiked Pit Effect

## Scope

Port the ordinary monster `PIT` and `SPIKED_PIT` new-trigger path far enough to match C `mintrap()`/`trapeffect_pit()` behavior for in-air avoidance, Sokoban drag-in, pass-wall monsters, visible fall messaging, iron-footwear spike protection, damage rolls, trap state, and fatal cleanup.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:1966` through `:2007` covers the monster `trapeffect_pit()` body.
- `nethack-c/upstream/src/trap.c:1974` through `:1988` covers non-grounded monster avoidance and Sokoban drag-in wording.
- `nethack-c/upstream/src/trap.c:1989` through `:1990` traps only non-wall-passing monsters.
- `nethack-c/upstream/src/trap.c:1991` through `:1998` covers visible fall messages, pit viper/fiend flavor, and trap reveal.
- `nethack-c/upstream/src/trap.c:2001` through `:2003` covers iron footwear and `rnd(10)` versus `rnd(6)` damage.
- `nethack-c/upstream/src/trap.c:3733` through `:3825` covers the `mintrap()` prelude, known-trap avoidance, learning, and in-air floor-trigger skip.
- `nethack-c/upstream/include/mondata.h:19` through `:24` defines flyers, floaters, and ceiling-clingers as non-grounded for pit handling.

## JS Change

- `js/allmain.js` now treats top-level and monster-data `inAir`, `flyer`, and `floater` as floor-trigger avoidance flags, while preserving the Sokoban non-hero pit exception.
- Ordinary monster movement routes `PIT` and `SPIKED_PIT` through a shared `monsterPitTrapEffect()` helper.
- Non-Sokoban in-air monsters skip the pit effect without learning, messages, damage, or RNG.
- Sokoban non-hero pits drag in-air monsters in with C-style "is dragged" wording and still apply pit state and damage.
- Pass-wall monsters take pit/spiked-pit damage but do not get `mtrapped` or consume the move as trapped.
- Spiked pits use `rnd(10)` unless the monster has worn iron footwear, which downgrades the damage to ordinary pit `rnd(6)`.
- Visible pit entries reveal the trap and include the C pit viper/fiend joke branch.
- Fatal pit damage now uses the same trap-kill cleanup path from the shared helper.

## Tests

- `monster iron shoes reduce spiked pit trap damage to ordinary pit damage`
- `pass-wall monster takes spiked pit damage without becoming trapped`
- `sokoban pit drags in-air monster into trap`
- `flying monster avoids ordinary pit trap without learning or damage`
- `sokoban pit trap killed gas spore explodes outside monster melee`

The direct tests use local monster, trap, armor, visibility, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Pet `PIT` and `SPIKED_PIT` new-trigger movement is covered by audit 545.
- Already-trapped monster pit escape, boulder fill, and metallivore spiked-pit eating remain outside this slice.
- `mselftouch()` from falling with a wielded cockatrice/chickatrice corpse remains unmodeled.
- Ceiling-clinger and long-worm segment handling for non-grounded pit avoidance remains deferred.
