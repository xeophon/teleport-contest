# Terrain-Created Lava Life-Saving

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:3202` lets a land-mine-created pit choose adjacent liquid fill via `fillholetyp()`.
- `nethack-c/upstream/src/trap.c:3204` sets the pit square terrain before calling `liquid_flow()`.
- `nethack-c/upstream/src/dig.c:864` prints the liquid fill message before object and hero fallout.
- `nethack-c/upstream/src/dig.c:867` applies floor-object liquid damage before hero damage.
- `nethack-c/upstream/src/dig.c:874` routes a hero on the filled square through `pooleffects(FALSE)`.
- `nethack-c/upstream/src/hack.c:3298` sends hero lava from `pooleffects()` into ordinary `lava_effects()`.
- `nethack-c/upstream/src/trap.c:6881` treats `Lifesaved`, discover mode, or wizard mode as fatal lava survival.
- `nethack-c/upstream/src/trap.c:6935` calls `done(BURNING)`, and `nethack-c/upstream/src/trap.c:6936` tries `safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT)` after life-saving returns.
- `nethack-c/upstream/src/end.c:1081` handles amulet life-saving for `BURNING`.

## JS Parity Slice

- Changed `applyEarthquakeHeroLiquidEffects()` to return the shared `heroLavaEntryEffect()` metadata for terrain-created lava instead of only mutating messages.
- Changed `earthquakeLiquidFlow()` to preserve hero liquid fallout metadata while retaining the existing terrain/object/monster side effects.
- Threaded land-mine post-blast terrain metadata through `landmineRecursivePitTrap()` and `finishLandminePitFalloutResult()`.
- Preserved the existing fatal terrain-created lava `lavaDeathMore` path and its caller-specific trailing `You die...` message.
- Allows a land-mine-created lava fill under the hero to consume life-saving, enter `lifeSavingMore`, and run the existing lava safe-teleport continuation.

## Tests

- `hero land mine adjacent lava fill consumes life saving and teleports to safety`

Verification:

```sh
node --test --test-name-pattern "hero land mine adjacent lava|hero land mine lava fill" test/shop-billing-helpers.test.mjs
node --test --test-name-pattern "hero land mine (life saving|adjacent lava|adjacent moat|recursive pit|on air level|on water level)|flying hero land mine life saving" test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
```

Result: focused terrain-created lava set passed 4 matching tests; broader land-mine pit/life-saving set passed 9 matching tests; full `test/shop-billing-helpers.test.mjs` passed 3108 tests.

## Remaining Gaps

- Wizard/explore-mode lava death refusal is still not implemented.
- Survivor `burn_stuff` inventory fire for water-walking and fire-resistant lava outcomes remains incomplete.
- Earthquake-drum pit fills use the same liquid helper but still need separate end-to-end life-saving coverage before claiming full non-land-mine terrain-created lava parity.
