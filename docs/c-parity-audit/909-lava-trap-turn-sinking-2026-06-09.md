# Lava Trap Turn Sinking

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/allmain.c:422` calls `sink_into_lava()` after the normal turn tail when `u.utraptype == TT_LAVA`.
- `nethack-c/upstream/src/trap.c:6991` clears the lava trap when the hero is no longer on lava terrain.
- `nethack-c/upstream/src/trap.c:7000` reduces non-fire-resistant HP to `(hp + 2) / 3` while sinking.
- `nethack-c/upstream/src/trap.c:7007` decrements the high-byte lava countdown by `1 << 8`.
- `nethack-c/upstream/src/trap.c:7011` prints `You sink below the surface and die.` and calls `done(DISSOLVED)`.
- `nethack-c/upstream/src/trap.c:7022` prints `You sink deeper into the lava.` and adds `rnd(4)` when the hero did not move.

## JS Parity Slice

- Added `processHeroLavaSinkingTurn()` for the packed `TT_LAVA` turn countdown.
- Hooked lava sinking into `moveloop_core()` after `afterMoveTurn(g)` and before `u.umoved` is cleared.
- Implemented terrain-clear, invulnerability skip, non-fire-resistant HP reduction, countdown death, slime burn-away on death, and stationary deeper-sinking message/`rnd(4)` extension.
- Routed countdown death through the normal `deathDieMore` flow with death cause `dissolved in molten lava`.
- Preserved nonfatal lava turn-tail messages across the synthetic `rhack(0)` pass.

## Tests

- `already lava-trapped fire-resistant hero sinks deeper on waited turn`
- `already lava-trapped non-fire-resistant hero loses two thirds of hp while sinking`
- `already lava-trapped hero dies when sinking countdown expires`
- `already lava-trapped hero clears trap state after leaving lava terrain`

Verification:

```sh
node --test --test-name-pattern "already lava-trapped" test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
```

Result: 3101 passing tests.

## Remaining Gaps

- Full `lava_effects()` inventory destruction, life-saving continuation, explore/wizard continuation, and safe teleport after surviving `DISSOLVED` remain incomplete.
- This slice does not add full `pooleffects(FALSE)` parity for non-lava stationary liquid turns.
