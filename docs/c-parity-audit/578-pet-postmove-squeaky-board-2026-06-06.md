# Pet Post-Move Squeaky Board

## Scope

Route tame pet first-entry `SQKY_BOARD` handling through a shared monster squeaky-board trap helper.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/monmove.c:1772` routes tame monsters through `dog_move()`.
- `nethack-c/upstream/src/monmove.c:1508` runs `postmov()` after movement and calls `mintrap()`.
- `nethack-c/upstream/src/trap.c:3795` computes known-trap state for the shared monster `mintrap()` path.
- `nethack-c/upstream/src/trap.c:3809` skips floor-trigger traps for in-air monsters before known-trap RNG.
- `nethack-c/upstream/src/trap.c:3812` lets known traps be avoided with the `rn2(4)` gate before learning/effects.
- `nethack-c/upstream/src/trap.c:1403` through `:1475` applies monster squeaky-board effects: in-air no-op, visible hearing feedback with `seetrap()`, visible deaf cringing for non-mindless monsters, unseen near/far hearing feedback, and `wake_nearto()`.

## JS Change

- `js/allmain.js` now extracts ordinary monster `SQKY_BOARD` handling into `monsterSqueakyBoardTrapEffect()`.
- Ordinary monsters and pets now share the same squeaky-board prelude: harmless in-air exit, known-trap avoidance before learning, then trap learning and effect handling.
- Visible non-deaf monsters now reveal the trap and print the C-shaped squeak message.
- Visible deaf heroes see non-mindless monsters cringe without revealing the trap.
- Unseen squeaky-board triggers use the C near/far hearing threshold and skip hearing feedback while deaf.
- Nearby sleeping monsters are woken by the shared helper.

## Tests

- `known squeaky board trap can be avoided before squeak effects`
- `deaf visible monster on squeaky board cringes without revealing trap`
- `pet squeaky board trap squeaks and wakes nearby monster through pet movement`

The tests drive the normal pet movement loop with local fixtures and explicit state. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Pet post-move fire, falling-rock, landmine, and rolling-boulder trap effects remain separate trap parity slices.
- Full pet leash slack/yelp and off-level migration handling remains broader `dog_move()` parity.
