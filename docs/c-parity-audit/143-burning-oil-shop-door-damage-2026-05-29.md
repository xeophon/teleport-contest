# 143 - Burning-oil shop-door damage and repair

## Implemented Slice

Direct hero-thrown lit-oil potion explosions now record real shop entrance door damage before the blast consumes the door, charge the current shopkeeper through the existing shop debt helpers after hero damage, and let the shopkeeper repair the entrance after C's `REPAIR_DELAY`.

The slice is intentionally door-only. It uses the shopkeeper's recorded shop-door coordinate and does not attempt to generalize every C `add_damage()` terrain case.

C anchors:

- Burning oil reaches the explosion floor pass through `explode_oil()` and `explode(..., BURNING_OIL, EXPL_FIERY)`: `nethack-c/upstream/src/potion.c:1686`, `nethack-c/upstream/src/explode.c:962`.
- Explosion floor effects run over the 3x3 area before monster damage, and hero damage precedes the final shop terrain payment pass: `nethack-c/upstream/src/explode.c:454`, `nethack-c/upstream/src/explode.c:503`, `nethack-c/upstream/src/explode.c:590`, `nethack-c/upstream/src/explode.c:681`.
- `zap_over_floor()` records `SHOP_DOOR_COST` with `add_damage()` before turning a closed shop door into `D_NODOOR`: `nethack-c/upstream/src/zap.c:5411`, `nethack-c/upstream/src/zap.c:5465`.
- Shop damage records are delayed by `REPAIR_DELAY` and repaired from shopkeeper movement when the damaged square is clear: `nethack-c/upstream/include/hack.h:76`, `nethack-c/upstream/include/mextra.h:113`, `nethack-c/upstream/src/shk.c:4398`, `nethack-c/upstream/src/shk.c:4800`, `nethack-c/upstream/src/shk.c:4892`.

JS changes:

- `applyBurningOilDoorTerrain()` now records `SHOP_DOOR_COST` for the live shopkeeper's real entrance door before setting the door to `D_NODOOR`: `js/cmd.js:14297`, `js/cmd.js:14311`.
- `explodeBurningOilPotion()` now runs the terrain-damage payment pass after hero damage and before explosion wakeup: `js/cmd.js:14364`, `js/cmd.js:14386`.
- Added a small shop terrain damage list plus `addShopTerrainDamage()`, `payForCurrentShopTerrainDamage()`, and `repairShopDamageForShopkeeper()` for the covered door row: `js/cmd.js:21768`, `js/cmd.js:21817`, `js/cmd.js:21866`.
- Shopkeepers now attempt delayed terrain repairs during their in-shop movement turn and surface the C-shaped whisper/reappearance messages through the normal topline flow: `js/allmain.js:5434`.

Tests:

- Hero-thrown lit oil over a shop entrance door records one `SHOP_DOOR_COST` damage row, charges debit, consumes the door, and prints damage after monster burning-oil damage: `test/shop-billing-helpers.test.mjs:21482`.
- Shopkeepers do not repair before `REPAIR_DELAY`, then restore the closed door and clear the damage row after the delay: `test/shop-billing-helpers.test.mjs:21516`.

## Deferred Gaps

- Exact `pay_for_damage()` prompting, refusal handling, and hot-pursuit side effects remain broader shop-ledger work. This slice records the same debt/robbed values and user-facing damage text for the covered fire case.
- Generic shop terrain damage beyond shop entrance doors remains deferred, including off-level repair catchup and non-door wall repair rows.
- Burning-oil drawbridge under-terrain and broader hero-on-liquid fallout remain terrain-work gaps separate from shop-door repair.
- The broader fire/explosion object scatter and litter details outside the covered burning-oil floor pass remain deferred.

## Verification

- `node --check js/cmd.js && node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "hero-thrown lit oil explosion records real shop-door damage|shopkeeper repairs burned shop entrance door" test/shop-billing-helpers.test.mjs` - 2 pass, 925 skipped.
- `node --test test/*.mjs` - 1008 pass.
- `npm run score` - 44/44 pass.
