# Monster Web Spinning

## Scope

Port monster-created spider webs in the monster post-move path. This covers cave spider and giant spider eligibility, C probability, cardinal support counting, existing web penalties, Sokoban upstairs line-of-sight gating, trap creation, cooldown, visibility messages, and seen-state updates.

The implementation uses deterministic helper tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/monmove.c:1226` through `:1239` defines `holds_up_web()` for out-of-bounds cells, obstructed terrain, up stairs/up ladders, and iron bars.
- `nethack-c/upstream/src/monmove.c:1243` through `:1249` counts only north, east, south, and west support squares.
- `nethack-c/upstream/src/monmove.c:1251` through `:1265` allows Sokoban web spinning only when the monster can see the up stairway.
- `nethack-c/upstream/src/monmove.c:1268` through `:1291` performs the webmaker, helpless, cooldown, existing-trap, probability, `maketrap()`, cooldown, message, and `tseen` behavior.
- `nethack-c/upstream/src/monmove.c:1690` calls `maybe_spin_web()` after monster movement/object handling.
- `nethack-c/upstream/src/trap.c:456` defines `maketrap()`.
- `nethack-c/upstream/src/trap.c:6516` defines `count_traps()`.
- `nethack-c/upstream/include/mondata.h:147` limits `webmaker()` to cave spiders and giant spiders.

## JS Change

- `js/allmain.js` now imports and calls `maketrap()` from the monster web post-move hooks.
- The existing `maybeSpinMonsterWeb()` RNG placeholder now implements the C gate order:
  - cave spider or giant spider only;
  - not sleeping or unable to move;
  - no `mspec_used`;
  - no existing trap at the monster square;
  - Sokoban rules allow the web;
  - then exactly one `rn2(1000)` probability roll.
- Probability is now `base * (countMonsterWebbingWalls(mx, my) + 1) - 3 * countExistingWebTraps()`, with base `15` for giant spiders and `5` for cave spiders.
- Successful probability calls `maketrap(mx, my, WEB)` directly. Cooldown `d(4,4)` is rolled only after `maketrap()` succeeds.
- Visible web creation prints `The <monster> spins a web.` for spotted spiders and `Something spins a web.` for visible squares with unspotted spiders, then marks the created web seen.
- Unseen web creation stays silent and leaves the web unseen.

## Tests

- `giant spider spins visible web at probability boundary`
- `giant spider failed web spin only consumes probability roll`
- `web spinner does not roll with existing trap at its square`
- `existing webs reduce cave spider spin probability after support count`
- `web spin does not set cooldown when maketrap rejects terrain`
- `visible square but unspotted spider spins something message`
- `unseen web spin creates unseen web silently`
- `sokoban web spin requires monster clear path to upstairs`

These tests assert trap creation or rejection, exact RNG calls, cooldown state, seen state, messages, existing web penalty, invalid terrain behavior, and the Sokoban no-RNG gate.

## Remaining Work

- Monster-spun webs in shops now record the C `add_damage(mx, my, 0L)` zero-cost marker after successful trap creation, and the shared shop repair path can remove the marked web after the repair delay.
- Broader monster post-move parity still needs continued audit for hide-under/eel concealment and shopkeeper post-move ordering around new monster-generated traps.
