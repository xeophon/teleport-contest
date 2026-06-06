# Web `#untrap` Reach And Tight Diagonals

## Scope

Port the C no-turn reach gates for web `#untrap`. This covers floor-reach rejection before web/container prompts, mounted/levitating/flying distinctions, and the tight-diagonal blocked-corner check before any web removal RNG.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:5904` through `:5922` runs `can_reach_floor(FALSE)` before floor trap/container handling and prints `There is a web here/there but you can't reach it...`.
- `nethack-c/upstream/src/engrave.c:187` through `:211` defines `can_reach_floor()`, including levitation, unskilled mounted riding, flying, huge forms, and ceiling-hider cases.
- `nethack-c/upstream/src/trap.c:5460` through `:5468` rejects tight diagonal web untrap when both side squares are bad rock and the hero is too loaded or too large.
- `nethack-c/upstream/src/hack.c:939` through `:946` defines `bad_rock()`, including pass-wall and tunnel exceptions.

## JS Change

- `js/cmd.js` now checks floor reach before current-square web/container prompts or web handling.
- `heroCanReachFloorForUntrap()` models the relevant C floor-reach states for this path: swallowed, levitation, unskilled mounted riding, ceiling-hider undetected state, flying, huge forms, and current-pit checks.
- `handleUntrapWebTrap()` now rejects tight diagonal blocked-corner attempts before RNG when the hero is carrying too much or is a large non-squeezing form.
- Riding reach uses explicit skill state when present, with NetHack role defaults as fallback.

## Tests

- `#untrap adjacent web is unreachable while levitating`
- `#untrap current-square web and box are unreachable while mounted unskilled`
- `#untrap adjacent web remains reachable while flying`
- `#untrap tight diagonal web is unreachable with a heavy inventory`
- `#untrap tight diagonal web is unreachable for large heroes`
- `#untrap tight diagonal web remains reachable for light small heroes`

These tests drive the real extended command input, assert exact no-RNG/no-turn behavior for blockers, preserve web/container state, and cover canary paths where C should still proceed into normal web removal.

## Remaining Work

- Box/chest trap side effects are still partial and tracked in `562-untrap-current-square-containers-2026-06-06.md`; failed-disarm one-shot trap state is covered in `565-untrap-box-one-shot-failure-2026-06-06.md`.
