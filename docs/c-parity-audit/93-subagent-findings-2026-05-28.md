# Subagent Findings 93 - Themed Buried Zombies

## Implemented Slice: Themed Buried Zombie Timers

Implemented the narrow "Buried zombies" themed-room fill parity slice.

- `nethack-c/upstream/dat/themerms.lua:151`: the fill is named "Buried zombies".
- `nethack-c/upstream/dat/themerms.lua:153`: species are selected from `nh.level_difficulty()`.
- `nethack-c/upstream/dat/themerms.lua:155`: low difficulty uses kobold, gnome, orc, and dwarf.
- `nethack-c/upstream/dat/themerms.lua:156`: difficulty above 3 adds elf and human.
- `nethack-c/upstream/dat/themerms.lua:158`: difficulty above 6 adds ettin and giant.
- `nethack-c/upstream/dat/themerms.lua:162`: corpse count is half of room area.
- `nethack-c/upstream/dat/themerms.lua:163`: species are shuffled per corpse.
- `nethack-c/upstream/dat/themerms.lua:164`: each object is a buried corpse with the selected monster type.
- `nethack-c/upstream/dat/themerms.lua:166`: the normal corpse rot timer is stopped.
- `nethack-c/upstream/dat/themerms.lua:167`: `zombify-mon` starts at `math.random(990, 1010)`.
- `nethack-c/upstream/src/sp_lev.c:2257`: `create_object()` applies a level-defined corpse species through `set_corpsenm()`.
- `nethack-c/upstream/src/sp_lev.c:2428`: buried level objects are moved through `bury_an_obj()`.
- `nethack-c/upstream/src/nhlobj.c:562`: Lua `stop_timer()` stops an object timer.
- `nethack-c/upstream/src/nhlobj.c:591`: Lua `start_timer()` starts the object timer.

JS now mirrors that lifecycle in `js/mklev.js`:

- `js/mklev.js:19163`: `themeroomBuriedZombieSpecies()` applies the low/medium/high difficulty gates.
- `js/mklev.js:19173`: `shuffleThemeroomSpecies()` uses the same Fisher-Yates pattern as Lua `shuffle()`.
- `js/mklev.js:19180`: `themeroom_buried_zombies()` creates half-room-area corpses.
- `js/mklev.js:19191`: selected corpse species replaces the initialized random corpse species.
- `js/mklev.js:19192`: ordinary corpse timeout is restarted for the selected species, matching `set_corpsenm()`.
- `js/mklev.js:19193`: normal rot/revive/zombify corpse timers are cleared, matching Lua `stop_timer("rot-corpse")`.
- `js/mklev.js:19195`: the explicit buried-zombie timer is `game.moves + rn1(21, 990)`.
- `js/mklev.js:19200`: corpses are placed in `level.buriedobjlist`, not as hidden entries in `level.objects`.

Regression coverage:

- `test/mklev-themerooms.test.mjs:47`: species gates at difficulty 1, 4, and 7.
- `test/mklev-themerooms.test.mjs:58`: buried corpse placement, no floor-object leakage, timer range, and species eligibility.
- `test/mklev-themerooms.test.mjs:79`: due `zombifyTurn` raises a zombie from the buried list.

The old JS-only `rn2(100)` compatibility shim in this helper is retained for now to avoid widening level-generation RNG churn while the location/finalization pipeline is still local. The source-backed RNG points for this slice are species shuffles, location selection, corpse creation/restarted corpse timeout, and the `rn2(21)` timer window from Lua `math.random(990, 1010)`.

## Fresh Follow-Up Audits

### Lit Oil Explosion Floor Collateral

C source:

- `nethack-c/upstream/src/potion.c:1685`: lit oil hitting the hero calls `explode_oil()`.
- `nethack-c/upstream/src/potion.c:1866`: lit oil hitting a monster calls `explode_oil()`.
- `nethack-c/upstream/src/explode.c:962`: burning oil uses `splatter_burning_oil()` and `explode(..., BURNING_OIL, EXPL_FIERY)`.
- `nethack-c/upstream/src/explode.c:454`: explosion floor effects run before monster and hero damage.
- `nethack-c/upstream/src/explode.c:481`: each affected square calls `zap_over_floor()`.
- `nethack-c/upstream/src/zap.c:5489`: fiery floor handling calls `burn_floor_objects(x, y, FALSE, type > 0)`.
- `nethack-c/upstream/src/zap.c:4610`: burnable floor objects are scrolls, spellbooks, and globs of green slime.
- `nethack-c/upstream/src/zap.c:4618`: each eligible item gets `!rn2(3)` destruction chance.

JS anchors:

- `js/cmd.js:13812`: `explodeBurningOilPotion()` currently handles boom/blast, monsters, and adjacent hero damage.
- `js/cmd.js:8216`: `burnFloorObjectsByFire()` is the narrow `burn_floor_objects()` equivalent.
- `js/cmd.js:8257`: `burnRayFloorObjectsByFire()` has the visible smoke feedback pattern.

Small slice: in `explodeBurningOilPotion()`, before monster/hero damage, iterate the 3x3 explosion area and call `burnFloorObjectsByFire()` with `heroCaused: true` and no per-object feedback, then add C-style smoke feedback for visible burned squares. Do not use broader `fireDamageFloorItem()` in this slice.

### Remote Non-Gold Projectile `ship_object()`

C source:

- `nethack-c/upstream/src/dothrow.c:1804`: non-gold projectile landing runs `flooreffects(..., "fall")` first.
- `nethack-c/upstream/src/dothrow.c:1819`: if no monster is hit, `ship_object()` runs before ordinary floor placement.
- `nethack-c/upstream/src/dothrow.c:1824`: floor placement occurs only if prior handling did not consume the object.
- `nethack-c/upstream/src/dokick.c:1963`: seen holes/trapdoors can be down-gates.
- `nethack-c/upstream/src/dokick.c:1660`: `ship_object()` uses the `rn2(3)` no-drop chance.
- `nethack-c/upstream/src/dokick.c:1695`: shop debt is converted before shipping.
- `nethack-c/upstream/src/dokick.c:1743`: shipped objects migrate.
- `nethack-c/upstream/src/dothrow.c:2715`: gold uses a different shipping order, so it remains excluded.

JS anchors:

- `js/cmd.js:20898`: `landProjectileObjectWithShopHandling()` handles hard break, floor effects, placement, shop return/debt, sale, and stacking.
- `js/cmd.js:20920`: current JS floor effects run before placement.
- `js/cmd.js:20931`: placement currently happens without a remote `ship_object()` gate.
- `js/cmd.js:22786`: current hole/trapdoor floor effects are hero-square only.

Small slice: after `earthFloorEffects()` returns false and before placement, add a non-gold hero projectile remote seen-hole/trapdoor down-gate. On `rn2(3) == 0`, convert unpaid shop debt, queue migration, and skip placement/sale/stacking. Exclude gold, boulders, ladders/stairs, hero-square fall handling, kicked objects, monster-thrown objects, and floor-pile loss until separate source-backed slices.

## Remaining Notes

- Broader buried-zombie emergence messaging and level-generation location parity remain out of scope for this slice.
- Diet metadata remains a compact registry cleanup candidate: add C-shaped carnivore/herbivore/omnivore/metallivore flags before broad pet-food or polyself caller rewrites.
