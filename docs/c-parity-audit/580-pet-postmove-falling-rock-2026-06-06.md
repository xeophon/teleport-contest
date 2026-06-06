# Pet Post-Move Falling Rock Trap

## Scope

Route tame pet first-entry `ROCKTRAP` handling through a shared monster falling-rock helper.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/monmove.c:1772` routes tame monsters through `dog_move()`.
- `nethack-c/upstream/src/monmove.c:1508` runs `postmov()` after movement and calls `mintrap()`.
- `nethack-c/upstream/src/trap.c:1060` classifies `ROCKTRAP` as a floor trigger.
- `nethack-c/upstream/src/trap.c:3795` computes known-trap state for the shared monster `mintrap()` path.
- `nethack-c/upstream/src/trap.c:3808` skips floor-trigger traps for in-air monsters before known-trap RNG.
- `nethack-c/upstream/src/trap.c:3812` lets known traps be avoided with the `rn2(4)` gate before learning/effects.
- `nethack-c/upstream/src/trap.c:3816` teaches the triggering monster and eligible witnesses before dispatching the effect.
- `nethack-c/upstream/src/trap.c:1376` handles spent known rock traps with `trap->once && trap->tseen && !rn2(15)`, prints the empty-trap feedback when visible and seen, deletes the trap, and redraws the square.
- `nethack-c/upstream/src/trap.c:1389` sets `trap->once`, creates a `ROCK`, reveals the trap only when the monster is in sight, and calls `thitm(..., d(2,6), FALSE)`.
- `nethack-c/upstream/src/trap.c:6711` applies forced-hit falling-object damage, treats `passes_rocks()` monsters as undamaged, leaves the rock on the floor, and routes lethal cleanup through normal monster death handling.

## JS Change

- `js/allmain.js` now extracts ordinary monster `ROCKTRAP` handling into `monsterRockTrapEffect()`.
- Ordinary monsters and pets now share the same falling-rock prelude: harmless in-air exit, known-trap avoidance before learning, then trap learning and effect handling.
- Actual falling-rock effects set `trap.once`, place or stack a rock on the floor, roll exactly `d(2,6)`, print visible hit and kill feedback, and leave rock-passing monsters undamaged.
- Spent seen rock traps use the C 1-in-15 empty-trap branch, delete the trap, redraw the square, and print the visible empty-trap message only when the monster and square are both seen.
- Lethal pet falling-rock damage uses the common trap-kill cleanup option so the outer pet post-move roll is skipped after removal.

## Tests

- `pet falling rock trap drops rock and damages pet through pet movement`
- `rock-passing pet falling rock trap drops rock without damage`
- `remembered-only falling rock trap does not report monster hit`
- `lethal pet falling rock trap removes pet through pet movement`
- `lethal pet falling rock trap helper marks pet post-move roll skipped`

The tests drive the normal pet movement loop or the shared helper with local fixtures and explicit state. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full pet leash slack/yelp and off-level migration handling remains broader `dog_move()` parity.
