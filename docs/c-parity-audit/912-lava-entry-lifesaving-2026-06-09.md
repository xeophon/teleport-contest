# Lava Entry Life-Saving

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:6871` enters the fatal lava branch after water-walking and fire-resistance checks.
- `nethack-c/upstream/src/trap.c:6881` treats `Lifesaved`, `discover`, or `wizard` as fatal-branch survival.
- `nethack-c/upstream/src/trap.c:6892` destroys pre-marked inventory while lava recursion is suppressed.
- `nethack-c/upstream/src/trap.c:6913` only prints worn-item burn messages and inventory destruction summaries when that fatal branch will survive.
- `nethack-c/upstream/src/trap.c:6927` prints `You burn to a crisp...`, calls `done(BURNING)`, then attempts `safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT)` after `done()` returns.
- `nethack-c/upstream/src/trap.c:6942` clears the lava recursion guard after successful rescue, then calls `rescued_from_terrain(BURNING)` and `spoteffects(FALSE)`.
- `nethack-c/upstream/src/end.c:1081` handles amulet life-saving for deaths up through `GENOCIDED`, including `BURNING`.

## JS Parity Slice

- Added a fatal-lava life-saving branch before `lavaDeathMore`.
- Consumes a worn amulet of life saving, appends the medallion glow message, and returns `{ lifeSaving: true }` so the existing `lifeSavingMore` cleanup handles HP restoration, CON loss, death-state clearing, and medallion crumble text.
- Queues same-level safe relocation with `safeTeleportHeroSameLevel()` through the shared `lifeSavingMore` continuation after the medallion recovery message, matching C's post-`done(BURNING)` rescue attempt in broad shape.
- Preserves ordinary fatal lava on `lavaDeathMore`.
- Splits lava fall and burn messages internally so survivor-only inventory destruction summaries can appear before `You burn to a crisp...` while existing joined fatal text remains unchanged.
- Emits C-shaped fatal-branch survivor inventory summary text when doomed inventory is destroyed and the hero has life-saving.
- Updates direct `m`-prefix lava movement to route life-saving lava results through `applyLifeSavingOrFatalCommandMode()`.

## Tests

- `m-prefix fatal lava consumes life saving and teleports to safety`

Verification:

```sh
node --test --test-name-pattern "m-prefix (fatal lava consumes life saving|fatal lava burns initial non-survivor|lava does not whole-burn|into lava burns non-fireproof water walking boots|into lava sinks fire-resistant|into lava burns away slime)" test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
```

Result: focused lava set passed 6 matching tests; full `test/shop-billing-helpers.test.mjs` passed 3105 tests.

## Remaining Gaps

- Wizard/explore-mode lava death refusal is still not implemented.
- Failed `safe_teleds()` countermeasures after repeated lava rescue are not modeled.
- Terrain-created lava, such as land-mine liquid fill, still flattens lava-entry fallout through its own path and needs separate life-saving propagation.
- `sink_into_lava()` countdown death still lacks life-saving, trap reset, and safe teleport continuation.
- Survivor `burn_stuff` inventory fire for water-walking and fire-resistant lava outcomes remains incomplete.
