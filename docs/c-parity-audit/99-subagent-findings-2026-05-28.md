# Subagent Findings 99 - Burning-Oil Water Terrain

## Implemented Slice: Lit-Oil Explosion Water And Pool Evaporation

Implemented the next direct burning-oil terrain row: direct lit-oil potion explosions now run fire-over-water and fire-over-pool effects during the 3x3 floor pass after webs and ice, before floor-object burning and before monster/hero burning-oil damage.

C source:

- `nethack-c/upstream/src/potion.c:1866`: direct monster hits with lit `POT_OIL` call `explode_oil(obj, tx, ty)`.
- `nethack-c/upstream/src/explode.c:974`: `explode_oil()` clears lit-oil state, marks the object as exploding, and routes to burning-oil explosion damage.
- `nethack-c/upstream/src/explode.c:478`: each 3x3 blast square calls `zap_over_floor()` before monster or hero explosion damage.
- `nethack-c/upstream/src/zap.c:5164`: fire floor order is web, ice, water/pool, fountain, then door/floor-object handling.
- `nethack-c/upstream/src/zap.c:5175`: water/pool handling creates a zero-damage gas cloud with `rnd(5)` off the Plane of Water.
- `nethack-c/upstream/src/zap.c:5191`: `MOAT`, `WATER`, and drawbridge-up over moat do not change terrain and use `Some water evaporates.` when visible off the water level.
- `nethack-c/upstream/src/zap.c:5198`: `POOL` changes to `ROOM`, clears flags, creates a `PIT`, and uses `The water evaporates.` when visible.
- `nethack-c/upstream/src/zap.c:5208`: swimmers unhide and pit fallout run after pool conversion.
- `nethack-c/upstream/src/zap.c:5489`: floor objects burn after water/pool terrain handling.

JS now mirrors the water/pool side effects in the direct lit-oil pass:

- `js/cmd.js:13906`: the burning-oil floor pass keeps `heardGas` across the whole 3x3 blast.
- `js/cmd.js:13921`: water/pool handling runs only when ice did not consume the square.
- `js/cmd.js:13922`: the pass reuses `applyFireRayWaterTerrain()` with `heroRay: true`, preserving C's nonnegative zap-type message behavior for deaf unseen water.
- `js/cmd.js:13930`: floor-object fire remains after water/pool terrain handling.
- `js/fire_breath.js:342`: the reused helper already handles gas clouds, pool-to-room conversion, pit creation, swimmer unhide, redraw, and pit fallout.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:17518`: visible `POOL` in the blast becomes `ROOM`, clears terrain fields, creates a `PIT`, creates gas, prints `The water evaporates.`, and still burns a floor spellbook afterward before monster damage.
- `test/shop-billing-helpers.test.mjs:17561`: visible `MOAT` in the blast creates gas and prints `Some water evaporates.` without changing terrain or creating a pit.

This still deliberately excludes fountains, doors, drawbridge-door collateral, and hero-on-liquid fallout beyond the pool-pit effects already present in the reused helper.

## Fresh Follow-Up Audits

### Remote Projectile `ship_object()` Down-Gate

C source:

- `nethack-c/upstream/src/dothrow.c:1780`: non-gold projectile hard-landing break tests happen before floor effects.
- `nethack-c/upstream/src/dothrow.c:1804`: `flooreffects(obj, x, y, "fall")` runs before the post-floor shipping gate.
- `nethack-c/upstream/src/dothrow.c:1819`: if no monster was hit, `ship_object()` runs before placement.
- `nethack-c/upstream/src/dothrow.c:1824`: placement, impact, shop landing, and stacking happen only after `ship_object()` declines.
- `nethack-c/upstream/src/do.c:288`: `flooreffects()` handles holes/trapdoors only when the hero is on the square, so remote projectiles reach `ship_object()`.
- `nethack-c/upstream/src/dokick.c:1657`: seen hole/trapdoor shipping uses `rn2(3)` and falls only on zero.
- `nethack-c/upstream/src/dokick.c:1684`: transit messaging precedes debt, breakage, and migration.
- `nethack-c/upstream/src/dokick.c:1695`: unpaid/shop-floor debt conversion precedes breakage and migration.
- `nethack-c/upstream/src/dokick.c:1717`: ship-specific breakage precedes migration.
- `nethack-c/upstream/src/dothrow.c:2698`: gold has different ordering and should stay out of this first slice.

JS anchors:

- `js/cmd.js:21019`: `landProjectileObjectWithShopHandling()` currently does hard break, floor effects, then immediate placement.
- `js/cmd.js:21052`: placement happens without the remote `ship_object()` gate.
- `js/cmd.js:22907`: existing hole/trapdoor floor-effect logic is hero-square only.
- `js/cmd.js:21986`: `shipObjectShopDebt()` already has much of the debt conversion behavior.
- `js/cmd.js:3362`: seen hole/trapdoor transit text support exists.
- `js/cmd.js:3372`: local migration queue support exists.
- `js/cmd.js:3472`: existing break-kind/resist helpers can model ship breakage.

Smallest safe slice: add a post-`earthFloorEffects()` gate for remote, non-gold hero projectiles landing on seen `HOLE` or `TRAPDOOR`. Cover fall-roll-before-break RNG order, transit-message-before-debt order, no sale/no stack/no placement, unpaid debt conversion, queueing, and fragile break-before-queue. Leave gold, stairs/ladders, floor-pile impact loss, and monster-thrown ordering separate.

### Stone-to-Flesh Carried Figurine Animation

C source:

- `nethack-c/upstream/src/zap.c:2966`: self-cast stone-to-flesh loops all inventory through `bhito()`.
- `nethack-c/upstream/src/zap.c:2002`: object handling requires `MINERAL` or `GEMSTONE`.
- `nethack-c/upstream/src/zap.c:2006`: object resistance uses `obj_resists(obj, 2, 98)`.
- `nethack-c/upstream/src/zap.c:2017`: figurines enter the corpstat branch.
- `nethack-c/upstream/src/zap.c:2019`: golem figurines animate, redirecting non-flesh golems to flesh golem data.
- `nethack-c/upstream/src/zap.c:2021`: vegetarian non-golems still become `MEATBALL`.
- `nethack-c/upstream/src/zap.c:2030`: other figurines animate through `makemon(ptr, x, y, NO_MINVENT | MM_NOMSG)`.
- `nethack-c/upstream/src/zap.c:2041`: successful animation stops object timers before consumption.
- `nethack-c/upstream/src/zap.c:2047`: visible success messages are `The figurine animates!` or `The figurine turns to flesh and animates!`.
- `nethack-c/upstream/src/makemon.c:1179`: `makemon()` relocates hero-square placement to `enexto()`.

JS anchors:

- `js/cmd.js:42180`: self-cast `.` dispatch calls `stoneToFleshInventoryEffect()`.
- `js/cmd.js:12543`: current inventory effect only applies replacement objects.
- `js/cmd.js:12353`: figurines/statues are treated as mineral.
- `js/cmd.js:12431`: object resistance already matches the C `2/98` gate.
- `js/cmd.js:12457`: current figurine support only handles vegetarian meatball replacement.
- `js/figurine.js:98`: `makeFigurineFamiliar()` is not C-equivalent because it adds familiar/tameness behavior.
- `js/mklev.js:6882`: JS `makemon()` already relocates hero-square monster placement.

Smallest safe slice: add a dedicated async carried self-cast figurine animation branch. Preserve C order: material and resistance gate, vegetarian meatball branch, golem redirect, `makemon(..., NO_MINVENT | MM_NOMSG)`, explicit timer stop, inventory removal, then animation message. Cover ordinary non-vegetarian figurine animation, stone-golem figurine to flesh golem, relocation, timer cleanup, and no familiar behavior. Leave floor figurines, shop billing, statue contents, and failed-animation corpse fallback separate.

### Pet Food Diet Preferences

C source:

- `nethack-c/upstream/src/dog.c:995`: `dogfood()` ranks foods from the pet's carnivorous/herbivorous/metallivorous predicates.
- `nethack-c/upstream/src/dog.c:1054`: tripe, meatball, meat ring, meat stick, and enormous meatball are `DOGFOOD` for carnivores and `MANFOOD` otherwise.
- `nethack-c/upstream/src/dog.c:1093`: tins are `ACCFOOD` for metallivores.
- `nethack-c/upstream/src/dog.c:1095`: apple, carrot, banana, and default food rows use herbivore branches.
- `nethack-c/upstream/src/dog.c:1119`: metallivorous pets prefer non-rustproof iron as `DOGFOOD` and other edible metals as `ACCFOOD`.
- `nethack-c/upstream/src/dogmove.c:282`: visible pet eating messages use `eats`, `devours`, or tunneler-specific `digs in`.

JS anchors:

- `js/allmain.js:1843`: current `dogFood()` uses ad hoc pet-name checks rather than diet metadata.
- `js/allmain.js:9653`: `movePet()` consumes floor food based on `dogFood()`.
- `js/allmain.js:9769`: pet goal selection also uses `dogFood()` rankings.
- `js/allmain.js:9850`: hero inventory scanning only follows closer for `DOGFOOD`.

Recommendation: pet-food diet preferences are smaller than non-food metallivorous `#eat`. Update `dogFood()` to use a shared diet lookup by monster name/data, then cover warhorse/horse/pony herbivore preferences, dog/cat carnivore meat preferences, herbivore non-preference for meatball when not starving, pet goal selection, and hero-carried `DOGFOOD` approach behavior. Leave non-food metallivorous `#eat` for a later command-selection slice.

## Remaining Notes

- Burning-oil floor objects, webs, hero slime cleanup, ice, and water/pool evaporation are now covered for direct lit-oil potion explosions.
- Remaining burning-oil terrain should proceed as separate fountain and door/drawbridge slices, with broader hero-on-liquid fallout deferred to terrain/liquid foundations.
- Remote projectile shipping, carried figurine animation, and pet-food diet preferences remain good compact next candidates.
