# Lava Trap Countdown Life-Saving

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/allmain.c:422` calls `sink_into_lava()` after the normal turn tail when `u.utraptype == TT_LAVA`.
- `nethack-c/upstream/src/trap.c:6991` clears the lava trap when the hero is no longer on lava terrain.
- `nethack-c/upstream/src/trap.c:7010` decrements the lava countdown, prints `You sink below the surface and die.`, calls `burn_away_slime()`, and reaches `done(DISSOLVED)`.
- `nethack-c/upstream/src/trap.c:7019` attempts `safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT)` after `done(DISSOLVED)` returns unless the hero is levitating or flying.
- `nethack-c/upstream/src/trap.c:7022` prints `You sink deeper into the lava.` and adds `rnd(4)` when the hero did not move.
- `nethack-c/upstream/src/end.c:1081` handles amulet life-saving for deaths up through `GENOCIDED`, including `DISSOLVED`.
- `nethack-c/upstream/src/end.c:727` clears `TT_LAVA` trap state during `savelife()` by calling `reset_utrap(FALSE)`.
- `nethack-c/upstream/src/teleport.c:717` performs safe same-level teleport relocation and may print the materialization message.

## JS Parity Slice

- Extends `processHeroLavaSinkingTurn()` so expired `TT_LAVA` countdown death can consume a worn amulet of life saving instead of always entering `deathDieMore`.
- Queues the C-shaped death text and medallion glow text before entering `lifeSavingMore`, preserving the normal HP restoration, CON loss, death-state clearing, and medallion crumble continuation.
- Clears `u.utrap` and `u.utraptype` during the `lifeSavingMore` continuation after lava countdown rescue.
- Queues same-level safe teleport for grounded heroes after lava countdown life-saving.
- Skips the safe teleport for levitating or flying heroes while still clearing the lava trap.
- Leaves the ordinary fatal countdown path unchanged when no life-saving amulet is available.

## Tests

- `already lava-trapped countdown death uses life saving and safe teleport`
- `already lava-trapped levitating life saving clears lava trap without teleport`

Verification:

```sh
node --test --test-name-pattern "(already lava-trapped (countdown death uses life saving|levitating life saving|hero dies when sinking countdown expires|fire-resistant hero sinks deeper|non-fire-resistant hero loses|hero clears trap state)|m-prefix fatal lava consumes life saving)" test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
```

Result: focused lava countdown/entry set passed 7 matching tests; full `test/shop-billing-helpers.test.mjs` passed 3107 tests.

## Remaining Gaps

- Wizard/explore-mode lava death refusal is still not implemented.
- Failed `safe_teleds()` countermeasures after repeated lava rescue are not modeled.
- Terrain-created lava, such as land-mine liquid fill, still flattens lava-entry fallout through its own path and needs separate life-saving propagation.
- Survivor `burn_stuff` inventory fire for water-walking and fire-resistant lava outcomes remains incomplete.
