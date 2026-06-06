# Web `#untrap` Boulder `Passes_walls`

## Scope

Port the C `Passes_walls` exception for adjacent web `#untrap` when a boulder is on the trap square. Ordinary heroes are still blocked with no turn; pass-wall heroes can reach through and proceed with the existing web removal flow.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:5440` through `:5458` implements `try_disarm()` and rejects a boulder on the target square only when `!Passes_walls && !under_u`.
- `nethack-c/upstream/include/youprop.h:284` through `:286` defines `Passes_walls` from intrinsic or extrinsic pass-wall state.
- `nethack-c/upstream/src/trap.c:5553` through `:5588` continues from `try_disarm()` into web removal once no pre-attempt blocker applies.

## JS Change

- `js/cmd.js` now has a local `heroPassesWalls()` predicate for hero/polyself pass-wall state.
- `handleUntrapWebTrap()` keeps the ordinary adjacent-boulder no-turn message, but skips that blocker when the hero passes walls.

## Tests

- `#untrap adjacent web is blocked by a boulder for ordinary heroes`
- `#untrap adjacent web boulder does not block pass-wall heroes`

These tests drive the real extended command input, assert exact RNG/no-RNG behavior, turn consumption, boulder blocker text, and web deletion/persistence.

## Remaining Work

- Reach-floor and tight diagonal web-untrap gates remain open.
- Box/chest trap side effects are still partial and tracked in `562-untrap-current-square-containers-2026-06-06.md`.
