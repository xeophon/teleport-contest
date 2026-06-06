# Monster Trapped Bear Trap And Web

## Scope

Port the C `mintrap()` branch for monsters and pets that are already `mtrapped` in a `BEAR_TRAP` or `WEB`. This covers the shared escape roll, visible trap discovery, visible pull-free messages, web failure staying caught, and metallivorous monsters eating bear traps after a failed escape.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3739` through `:3789` covers the already-trapped `mintrap()` branch before `trapeffect_selector()`.
- `nethack-c/upstream/src/trap.c:3742` through `:3749` marks visible `PIT`, `BEAR_TRAP`, `HOLE`, and `WEB` traps seen when the trapped monster is visible.
- `nethack-c/upstream/src/trap.c:3751` through `:3772` consumes `rn2(40)` and, for visible bear traps and webs, prints `"%s pulls free of the %s."` before clearing `mtrapped`.
- `nethack-c/upstream/src/trap.c:3773` through `:3781` handles metallivores eating a bear trap after the escape roll fails: visible `"eats a bear trap!"`, `deltrap()`, `meating = 5`, and `mtrapped = 0`.
- `nethack-c/upstream/src/trap.c:7100` through `:7155` shows `trapname(ttyp, FALSE)` uses the ordinary trap explanation when not hallucinating, giving `"bear trap"` and `"web"` for this branch.
- `nethack-c/upstream/src/monmove.c:1733` through `:1743` shows that already-trapped monsters run `mintrap()` before ordinary or pet movement, and `Trap_Caught_Mon` stops the turn.

## JS Change

- `js/allmain.js` extends `monsterTrappedTrapTurn()` from `PIT`/`SPIKED_PIT` to also handle `BEAR_TRAP` and `WEB`.
- Failed escape leaves bear-trapped and webbed monsters caught, with the `rn2(40)` gate and no first-entry trap re-triggering.
- Easy pit escape and same-square boulder escape remain pit-only, matching the `is_pit()` gates in C.
- Successful visible escape now prints the C-shaped pull-free message and clears `mtrapped`.
- Metallivorous monsters that fail bear-trap escape now eat the bear trap, remove it, set `meating = 5`, clear `mtrapped`, and spend the turn in the monster/pet callers.
- Full monster turns decrement the newly-created bear-trap eating delay before movement, matching the C `m_move()` path after `mintrap()` returns finished.

## Tests

- `already-trapped monster bear trap and web escape failure stays caught`
- `already-trapped monster pulls free of visible bear trap and web`
- `already-trapped easy pit escape monster does not auto-escape bear trap or web`
- `already-trapped bear trap and web ignore same-square boulder escape branch`
- `metallivorous trapped monster eats bear trap only after failed escape`
- `metallivorous trapped monster escape success leaves bear trap intact`
- `monster turn bear-trap eating spends the turn before movement`
- `pet turn trapped web failure stays caught without same-square re-trigger`

The tests use local monster, pet, trap, visibility, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Already-trapped `HOLE` behavior is covered by audit 548.
- Full first-entry web tear-through behavior for giants, large monsters, and long worms remains broader web trap work.
- Full same-turn `meating` timing for trap-created eating delays outside metallivorous bear-trap eating remains broader monster-turn parity.
- Full external boulder-combat damage and hero-credit behavior remains owned by the broader floor-effects/projectile paths.
