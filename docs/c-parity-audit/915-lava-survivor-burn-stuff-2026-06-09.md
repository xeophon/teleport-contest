# Lava Survivor Burn Stuff

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:6811` computes initial `usurvive = Fire_resistance || (Wwalking && dmg < u.uhp)`.
- `nethack-c/upstream/src/trap.c:6822` only enters the fatal whole-stack inventory premark when that initial survival check fails.
- `nethack-c/upstream/src/trap.c:6874` applies full lava damage to a water-walking survivor.
- `nethack-c/upstream/src/trap.c:6876` sends that water-walking survivor to `burn_stuff`.
- `nethack-c/upstream/src/trap.c:6964` handles fire-resistant sinking when the hero is not water-walking and not already trapped in lava.
- `nethack-c/upstream/src/trap.c:6968` sets the packed `TT_LAVA` countdown.
- `nethack-c/upstream/src/trap.c:6971` prints the slight-burn lava sinking message.
- `nethack-c/upstream/src/trap.c:6978` applies the one-HP lava sinking damage when possible.
- `nethack-c/upstream/src/trap.c:6983` enters `burn_stuff`.
- `nethack-c/upstream/src/trap.c:6984` calls `destroy_items(&youmonst, AD_FIRE, dmg)`.
- `nethack-c/upstream/src/trap.c:6985` then calls `ignite_items(gi.invent)`.
- `nethack-c/upstream/src/zap.c:5997` scales selected fire-destroyed stacks by `dmg_in / 5`.
- `nethack-c/upstream/src/zap.c:5998` adds one stack when the remainder beats `rn2(5)`.
- `nethack-c/upstream/src/zap.c:6045` uses reservoir selection after eligible stacks exceed the limit.
- `nethack-c/upstream/src/zap.c:5896` rolls `!rn2(3)` for each item in a selected stack.
- `nethack-c/upstream/src/zap.c:5903` uses count-sensitive partial-stack destruction messages.
- `nethack-c/upstream/src/zap.c:5930` calls `useup()` once per destroyed item, preserving any remainder.
- `nethack-c/upstream/src/trap.c:7161` defines `ignite_items()`.
- `nethack-c/upstream/src/trap.c:7168` only ignites eligible light-source style items.

## JS Parity Slice

- Added `lavaSurvivorBurnStuff()` to reuse generic `fireDamageInventory(dmg, true, false, ...)` for lava survivor `destroy_items()` plus `ignite_items()` behavior.
- Used `allowLifeSaving: true` so lethal inventory fire or follow-up fire damage can enter the existing life-saving continuation.
- Passed an empty `preburnedArmor` marker so survivor `burn_stuff` skips the fire-trap worn-armor prepass.
- Changed the water-walking survivor branch to apply lava damage, then run partial fire inventory destruction instead of returning immediately.
- Changed the fire-resistant sink branch to set `TT_LAVA`, apply the slight HP loss, then run partial fire inventory destruction.
- Marked the ordinary fatal lava path with `lavaDeath` so callers can distinguish special `lavaDeathMore` handling from survivor inventory-fire fatality.
- Threaded non-`lavaDeath` survivor fatality through direct movement and land-mine terrain-created lava fallout.

## Tests

- `m-prefix water-walking lava survivor runs burn_stuff on scroll stack`
- `m-prefix fire-resistant lava survivor runs burn_stuff on potion stack`

Verification:

```sh
node --test --test-name-pattern "m-prefix (water-walking lava survivor runs burn_stuff|fire-resistant lava survivor runs burn_stuff|lava does not whole-burn|fatal lava burns initial non-survivor|into lava sinks fire-resistant|fatal lava consumes life saving)" test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
```

Result: focused lava survivor burn set passed 6 matching tests; full `test/shop-billing-helpers.test.mjs` passed 3110 tests.

## Remaining Gaps

- Wizard/explore-mode lava death refusal is still not implemented.
- Failed `safe_teleds()` countermeasures after repeated lava rescue are not modeled.
- Earthquake-drum terrain-created lava still needs end-to-end life-saving coverage.
- Generic `fireDamageInventory()` still lacks C's fire inventory resistance chance.
- Generic `fireDamageInventory()` still uses full selected `in_use` stack quantity instead of subtracting one first.
- Potion vapor effects still happen before the destruction message in the JS generic helper.
- Fatal lava hard `obj_resists(obj, 0, 0)` RNG consumption and wand/fire-horn exemption parity are still incomplete.
