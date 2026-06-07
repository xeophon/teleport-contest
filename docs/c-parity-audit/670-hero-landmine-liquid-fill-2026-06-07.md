# 670 - Hero Landmine Liquid Fill

## C Source

- `nethack-c/upstream/src/trap.c:2585-2597` converts a triggered hero landmine to a temporary pit, applies blast HP loss, calls `blow_up_landmine(trap)`, then recursively enters the pit only if `t_at(u.ux,u.uy)` still exists.
- `nethack-c/upstream/src/trap.c:3197-3215` applies the post-blast trap fallout order: air/water-level deletion first, then `fillholetyp(x,y,FALSE)`, `liquid_flow()` when nearby liquid fills the hole, otherwise visible non-owned pit conversion, followed by `fill_pit(x,y)`.
- `nethack-c/upstream/src/dig.c:604-637` defines `fillholetyp()`: scan the 3x3 neighborhood, count moat/pool/lava, dampen ordinary pool count by `/= 3`, and return `LAVAPOOL`, `MOAT`, `POOL`, or `ROOM` through the same RNG gates.
- `nethack-c/upstream/src/dig.c:833-879` defines `liquid_flow()`: terrain must already be liquid, the passed trap is deleted, frozen/buried objects are released, optional visible fill feedback is printed, floor objects take liquid damage, and hero/monster liquid effects run immediately.

## Port Notes

- `landminePostBlastTrap()` now runs the existing `earthquakeFillHoleType()` decision after the air/water-level deletion gate.
- When the fill type is liquid, landmine fallout reuses `earthquakeLiquidFlow()` with a landmine-only optional fill message, then returns `null` so `movementPitResult(..., { recursive: true })` is skipped.
- `earthquakeLiquidFlow()` keeps existing earthquake behavior by default; the new `fillMessage` option is only supplied by landmine fallout when the square is visible.
- Lava-filled landmine pits set the existing `lavaDeathMore` continuation while the landmine trap result only requests a More prompt, so generic trap fatal handling does not replace the lava-specific death flow.
- Moat-filled pits use C-style hero entry wording (`moat`, not generic pool) while the fill message remains `water`.
- After landmine liquid fill, same-square boulders are dunked after liquid object/hero fallout, matching C's post-`liquid_flow()` `maybe_dunk_boulders()` ordering; the boulder canary includes acid-potion damage before dry-land cleanup.
- Liquid fill that replaces old ice now clears that square's melt-ice timers, matching C's trailing `spot_checks()` cleanup while preserving unrelated ice timers.
- Landmine liquid fill now refreshes vision and the blast square after the post-liquid boulder pass, covering C's trailing `recalc_block_point()` behavior for consumed boulders.

## Tests

- `hero land mine adjacent moat fills pit before recursive fallout`
- `hero land mine adjacent lava fills pit and uses lava death prompt`
- `flying hero sitting on hidden land mine can air-current fill pit with water`
- `deferred hero land mine liquid fill dunks same-square boulder after water fallout`
- `deferred land mine liquid fill refreshes consumed boulder glyph`
- `deferred hero land mine liquid fill clears old ice melt timer`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "land mine|landmine" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Full `blow_up_landmine()` fallout remains partial: scatter, engraving deletion, wakeups, doors/drawbridges, and drawbridge destruction are outside this slice.
