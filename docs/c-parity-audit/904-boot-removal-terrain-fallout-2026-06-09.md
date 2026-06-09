# Boot Removal Terrain Fallout

Date: 2026-06-09

## C anchors

- `nethack-c/upstream/src/do_wear.c:1969` queues `You finish taking off your <boots>.` before the delayed armor callback runs.
- `nethack-c/upstream/src/do_wear.c:262` `Boots_off()` captures `uarmf`, clears `W_ARMF` with `setworn(NULL, W_ARMF)`, then applies boot-specific fallout.
- `nethack-c/upstream/src/do_wear.c:280` water walking boots over pool or lava call `spoteffects(TRUE)` after the boots are no longer worn, unless another terrain-avoidance state still applies.
- `nethack-c/upstream/src/do_wear.c:300` levitation boots call `float_down()` when they were the sole levitation source, which lets lava underfoot route through `lava_effects()`.
- `nethack-c/upstream/src/do_wear.c:2746` boot removal blockers cover bear traps and `TT_INFLOOR`; `TT_LAVA` is not a takeoff blocker.
- `nethack-c/upstream/src/trap.c:4024` `float_down()` first clears the requested levitation masks, returns if another levitation source remains, and then checks pool and lava terrain.
- `nethack-c/upstream/src/trap.c:4107` `float_down()` calls `lava_effects()` for lava underfoot.
- `nethack-c/upstream/src/trap.c:6794` `lava_effects()` rolls `d(6,6)`, burns/removes boots first when applicable, sinks fire-resistant heroes into lava, and otherwise enters the fatal burn path.

## JS changes

- Added shared `addBootsOffSideEffects()` so delayed `T` completion, queued More continuation, and polyself boot fallout use the same post-removal terrain and speed side effects.
- Added levitation boots over lava handling after the boots are unworn, including discovery, lava damage, trap state, fatal lava More state, and inventory removal for non-resistant heroes.
- Routed delayed armor completion in both `allmain.js` occupation paths through boot fallout before glove-removal fallout, preserving the C finish-message-first order.
- Routed the queued finish-message More continuation in `cmd.js` through boot fallout after worn state is cleared.
- Kept `TT_LAVA` out of takeoff blockers; lava is handled as post-removal terrain fallout.
- Guarded fumble boot timeout scheduling so it only applies to donning, not taking fumble boots off.

## Tests

- `takeoff command levitation boots over lava sink after delayed removal`
- `takeoff command fumble boots does not schedule donning fumble timeout`
- `successful centaur polyself losing levitation boots over lava burns before drop`

## Verification

- `node --check js/cmd.js`
- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "levitation boots over lava|water walking boots over lava|levitation boots over pool|takeoff command levitation boots|takeoff command blocks boots|fumble boots does not" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `git diff --check`
- `npm run score` (`44/44 passing`)

## Remaining gaps

- Armor destruction paths still need a separate audit for boot fallout triggered by burned or destroyed worn boots.
- Full `lava_effects()` parity still has unmodeled inventory destruction, lifesaving/explore rescue, fireproof item, and recursive boot-burning details.
- Full `spoteffects()` and `float_down()` parity still has unmodeled trap, steed, swallow, Sokoban, and edge-terrain branches.
- Jumping boot extrinsic parity remains limited to the currently modeled command surfaces.
