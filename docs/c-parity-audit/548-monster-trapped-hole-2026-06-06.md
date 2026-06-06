# Monster Trapped Hole

## Scope

Port the C `mintrap()` branch for monsters and pets that are already `mtrapped` on a `HOLE`. This covers the shared escape roll, visible trap discovery, failure staying caught, and silent escape success without applying pit-only, bear-trap, or web behavior.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3739` through `:3789` covers the already-trapped `mintrap()` branch before `trapeffect_selector()`.
- `nethack-c/upstream/src/trap.c:3742` through `:3749` marks visible `PIT`, `BEAR_TRAP`, `HOLE`, and `WEB` traps seen when the trapped monster is visible.
- `nethack-c/upstream/src/trap.c:3751` through `:3772` consumes `rn2(40)` and clears `mtrapped` on success. `HOLE` does not match the pit climb message or the bear/web pull-free message, so success is silent.
- `nethack-c/upstream/src/trap.c:3752` through `:3760`, `:3764` through `:3769`, and `:3773` through `:3787` keep boulder fill, easy pit messaging, bear/web pull-free messaging, and metallivore eating behavior outside `HOLE`.
- `nethack-c/upstream/src/trap.c:3789` returns `Trap_Caught_Mon` only when `mtrapped` remains set.
- `nethack-c/upstream/src/monmove.c:1733` through `:1743` shows that already-trapped monsters run `mintrap()` before ordinary or pet movement, and `Trap_Caught_Mon` stops the turn.

## JS Change

- `js/allmain.js` extends `monsterTrappedTrapTurn()` to handle `HOLE` with the same `rn2(40)` escape gate as pit, bear trap, and web.
- Visible already-trapped monsters and pets now mark an unseen hole as seen.
- Failed escape leaves the monster caught and avoids first-entry hole/trapdoor effects.
- Successful escape clears `mtrapped` without a pull-free or climb message.
- Easy pit escape, same-square boulder fill, and metallivore eating remain gated away from `HOLE`.

## Tests

- `already-trapped monster hole escape failure stays caught and reveals trap`
- `already-trapped monster hole escape success clears trapped silently`
- `already-trapped easy pit escape monster does not auto-escape hole`
- `already-trapped monster hole ignores same-square boulder escape branch`
- `metallivorous trapped monster on hole failure stays caught without eating trap`
- `pet turn trapped hole failure stays caught without same-square re-trigger`

The tests use local monster, pet, trap, visibility, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- First-entry monster and pet `HOLE` and `TRAPDOOR` effects remain broader trap parity work.
- Full same-turn `meating` timing for trap-created eating delays outside the covered bear-trap path remains broader monster-turn parity.
