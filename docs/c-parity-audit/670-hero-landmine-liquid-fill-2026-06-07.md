# 670 - Hero Landmine Liquid Fill

## C Source

- `nethack-c/upstream/src/trap.c:2585-2597` converts a triggered hero landmine to a temporary pit, applies blast HP loss, calls `blow_up_landmine(trap)`, then recursively enters the pit only if `t_at(u.ux,u.uy)` still exists.
- `nethack-c/upstream/src/trap.c:3179-3191` runs shared blast fallout before pit conversion: scatter objects, delete the blast engraving, wake nearby monsters, break doors, and destroy any lowered drawbridge or drawbridge wall at the blast square.
- `nethack-c/upstream/src/explode.c:749-935` defines `scatter()`: source-square objects are extracted before movement, boulders/statues can fracture before destruction and movement, surviving objects receive direction/range, all movement resolves, then landing floor effects run.
- `nethack-c/upstream/src/trap.c:3197-3215` applies the post-blast trap fallout order: air/water-level deletion first, then `fillholetyp(x,y,FALSE)`, `liquid_flow()` when nearby liquid fills the hole, otherwise visible non-owned pit conversion, followed by `fill_pit(x,y)`.
- `nethack-c/upstream/src/dig.c:604-637` defines `fillholetyp()`: scan the 3x3 neighborhood, count moat/pool/lava, dampen ordinary pool count by `/= 3`, and return `LAVAPOOL`, `MOAT`, `POOL`, or `ROOM` through the same RNG gates.
- `nethack-c/upstream/src/dig.c:833-879` defines `liquid_flow()`: terrain must already be liquid, the passed trap is deleted, frozen/buried objects are released, optional visible fill feedback is printed, floor objects take liquid damage, and hero/monster liquid effects run immediately.
- `nethack-c/upstream/src/dbridge.c:888-968` defines drawbridge destruction: bridge terrain changes to its underlying moat/lava/ice/floor, the wall becomes a doorless doorway, traps and engravings are deleted on both bridge and wall squares, vision refreshes, and stronghold bridge state is marked.

## Port Notes

- `landminePostBlastTrap()` now runs the existing `earthquakeFillHoleType()` decision after the air/water-level deletion gate.
- When the fill type is liquid, landmine fallout reuses `earthquakeLiquidFlow()` with a landmine-only optional fill message, then returns `null` so `movementPitResult(..., { recursive: true })` is skipped.
- `earthquakeLiquidFlow()` keeps existing earthquake behavior by default; the new `fillMessage` option is only supplied by landmine fallout when the square is visible.
- Lava-filled landmine pits set the existing `lavaDeathMore` continuation while the landmine trap result only requests a More prompt, so generic trap fatal handling does not replace the lava-specific death flow.
- Moat-filled pits use C-style hero entry wording (`moat`, not generic pool) while the fill message remains `water`.
- After landmine liquid fill, same-square boulders are dunked after liquid object/hero fallout, matching C's post-`liquid_flow()` `maybe_dunk_boulders()` ordering; the boulder canary includes acid-potion damage before dry-land cleanup.
- Liquid fill that replaces old ice now clears that square's melt-ice timers, matching C's trailing `spot_checks()` cleanup while preserving unrelated ice timers.
- Landmine liquid fill now refreshes vision and the blast square after the post-liquid boulder pass, covering C's trailing `recalc_block_point()` behavior for consumed boulders.
- Hero and rolling-boulder landmine blasts share engraving deletion at the blast square, including air/water-level cases where no pit remains.
- Hero landmine blasts break a door on the blast square before the air/water-level deletion gate, matching C's pre-pit fallout order.
- Hero landmine blasts wake nearby monsters with C's `wake_nearto(..., 400)` radius semantics before the pit/liquid decision.
- Hero landmine blasts now destroy a lowered drawbridge or adjacent drawbridge wall before liquid/pit fallout. The covered slice updates bridge and wall terrain, removes traps and engravings from both squares, refreshes vision, wakes monsters near the destroyed bridge, and records stronghold bridge state.
- Hero landmine blasts now run a first floor-object scatter pass before engraving, door, drawbridge, liquid, and pit fallout. This slice covers the ordering canary where a non-fractured boulder remains blocked at the blast square and fills the resulting pit while a same-square dagger scatters away and is not buried.

## Tests

- `hero land mine adjacent moat fills pit before recursive fallout`
- `hero land mine on water level leaves no recursive pit`
- `deferred hero land mine water-level blast deletes engraving and breaks door`
- `deferred hero land mine destroys lowered drawbridge span`
- `deferred hero land mine destroys drawbridge from portcullis square`
- `hero land mine adjacent lava fills pit and uses lava death prompt`
- `flying hero sitting on hidden land mine can air-current fill pit with water`
- `deferred hero land mine liquid fill dunks same-square boulder after water fallout`
- `deferred land mine liquid fill refreshes consumed boulder glyph`
- `deferred hero land mine liquid fill clears old ice melt timer`
- `deferred hero land mine scatter moves dagger before boulder pit fill`
- `attached ball fallback land mine scatter moves dagger before boulder pit fill`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "land mine|landmine" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Full `blow_up_landmine()` fallout remains partial: full `scatter()` stack splitting, breakable-object destruction, hero/monster hit handling, shop accounting, complete fractured-fragment scattering, drawbridge debris scattering, drawbridge occupant damage, and bridge-object floor effects are outside this slice.
