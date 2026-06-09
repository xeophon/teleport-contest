# Terrain-Created Lava Entry

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:2585` converts a hero-triggered land mine into a pit before blast fallout.
- `nethack-c/upstream/src/trap.c:3202` lets adjacent lava fill that pit as `LAVAPOOL`.
- `nethack-c/upstream/src/dig.c:858` starts `liquid_flow()` terrain replacement and trap cleanup.
- `nethack-c/upstream/src/dig.c:867` prints the fill message before liquid damage fallout.
- `nethack-c/upstream/src/dig.c:874` routes hero liquid fallout through `pooleffects(FALSE)`.
- `nethack-c/upstream/src/hack.c:3271` and `nethack-c/upstream/src/hack.c:3298` route non-levitating/flying hero lava through ordinary `lava_effects()`.
- `nethack-c/upstream/src/trap.c:6852` burns vulnerable worn boots before the final lava outcome.
- `nethack-c/upstream/src/trap.c:6964` applies fire-resistant lava sinking with `TT_LAVA`.

## JS Parity Slice

- Replaced the bespoke terrain-created hero lava fatal branch in `applyEarthquakeHeroLiquidEffects()` with `heroLavaEntryEffect(LAVAPOOL)`.
- Preserved `earthquakeLiquidFlow()` ordering: terrain change, trap deletion, fill message, floor-object damage, then hero lava effects.
- Kept the terrain-created fatal path's current immediate `You die...` framing after the shared lava fatal message.
- Landmine-created lava now burns vulnerable worn boots first and now sinks fire-resistant heroes into `TT_LAVA` instead of silently returning.

## Tests

- `hero land mine adjacent lava fill sinks fire-resistant hero`
- `hero land mine lava fill burns water walking boots before fire-resistant sink`

Existing fatal coverage remains:

- `hero land mine adjacent lava fills pit and uses lava death prompt`

Verification:

```sh
node --test --test-name-pattern "hero land mine adjacent lava|hero land mine lava fill" test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
```

Result: 3097 passing tests.

## Remaining Gaps

- Full `lava_effects()` inventory burn, lifesaving, wizard, and explore-mode handling remains incomplete.
- Per-turn `sink_into_lava()` trap countdown and deeper-sinking messages are covered by `909-lava-trap-turn-sinking-2026-06-09.md`.
- This slice intentionally does not broaden `pooleffects(FALSE)` into full `spoteffects()` pickup/trap behavior.
