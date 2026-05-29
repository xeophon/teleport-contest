# 141 - Ordinary corpse toss_up and fresh deferred slices

## Implemented Slice

### Ordinary non-petrifying corpse toss_up

Hero-thrown ordinary corpses in the upward direction now use the C `toss_up()` generic falling-object path instead of falling through to direction help. The slice is limited to non-petrifying, non-Rider corpses.

C anchors:

- Upward throws call `toss_up(obj, rn2(5) && !Underwater)`: `nethack-c/upstream/src/dothrow.c:1588`.
- `toss_up()` treats only touch-petrifying eggs/corpses as petrifiers; ordinary corpses follow the generic non-potion falling-object branch: `nethack-c/upstream/src/dothrow.c:1260`, `nethack-c/upstream/src/dothrow.c:1341`.
- Roof/self/floor break tests can consume `obj_resists()` RNG even though ordinary corpses do not break: `nethack-c/upstream/src/dothrow.c:1268`, `nethack-c/upstream/src/dothrow.c:1291`, `nethack-c/upstream/src/dothrow.c:2582`.
- Falling corpse damage starts from weight, caps at 6, hard helmets reduce damage to 1, `udaminc` is applied, and `Maybe_Half_Phys()` halves after those adjustments: `nethack-c/upstream/src/dothrow.c:1356`, `nethack-c/upstream/src/dothrow.c:1374`, `nethack-c/upstream/src/dothrow.c:1380`, `nethack-c/upstream/include/hack.h:1236`.
- `hitfloor(obj, TRUE)` runs before `losehp()`, so fatal falling-object damage still leaves the object on the floor first: `nethack-c/upstream/src/dothrow.c:1420`.

JS changes:

- `heroThrownCorpseFallingDamage()` now uses exported `WT_TO_DMG`, applies hard-helmet capping, `udaminc`, and a local `Maybe_Half_Phys()` equivalent for this falling-corpse path: `js/cmd.js:15304`.
- Added ordinary corpse upward/self-hit helpers that preserve C breaktest order and land the corpse before HP loss: `js/cmd.js:15359`, `js/cmd.js:15376`.
- Added the upward command branch for non-petrifying, non-Rider carried corpses, including split-stack/shop-bill preservation and fatal death-more handling: `js/cmd.js:25485`, `js/cmd.js:52499`.

Tests:

- Ordinary newt corpse self-hits, damages, and lands without command-assist fallback: `test/shop-billing-helpers.test.mjs:20040`.
- Heavy ordinary corpse hard-helmet damage cap, roof/self/floor RNG order, and landing: `test/shop-billing-helpers.test.mjs:20069`.
- Half physical damage applies after `udaminc`: `test/shop-billing-helpers.test.mjs:20101`.
- Fatal falling-object damage leaves the corpse on the floor before death handling: `test/shop-billing-helpers.test.mjs:20130`.

## Fresh Deferred Findings

- Hero-thrown down-gates through down stairs, down ladders, and special stairs remain missing. C `ship_object()` maps down stairs to `MIGR_STAIRS_UP`/`MIGR_SSTAIRS`, ladders to `MIGR_LADDER_UP`, skips the `rn2(3)` no-drop chance for ladders, stores source-level metadata, and delivers to matching destination stair coordinates (`nethack-c/upstream/src/dokick.c:1657`, `nethack-c/upstream/src/dokick.c:1743`, `nethack-c/upstream/src/dokick.c:1953`, `nethack-c/upstream/src/dokick.c:1958`, `nethack-c/upstream/src/mkobj.c:2714`, `nethack-c/upstream/src/dokick.c:1802`). JS projectile shipping only recognizes seen holes/trapdoors and migration delivery currently places at random accessible squares (`js/cmd.js:22488`, `js/cmd.js:3373`, `js/cmd.js:3404`).
- Burning-oil shop-door damage/repair is not implemented. C records real shop entrance door damage with `SHOP_DOOR_COST`, delays repair by `REPAIR_DELAY`, and repairs via shopkeeper movement (`nethack-c/upstream/include/hack.h:76`, `nethack-c/upstream/include/mextra.h:113`, `nethack-c/upstream/src/zap.c:5466`, `nethack-c/upstream/src/shk.c:4399`, `nethack-c/upstream/src/shk.c:4800`, `nethack-c/upstream/src/shk.c:4892`). JS burning oil destroys/reveals doors but records no shop terrain damage (`js/cmd.js:14296`).
- Carried non-food metallivorous `#eat` is missing. C lets metallivorous forms eat metallic non-food inventory through `is_edible()`/`doeat_nonfood()`, with rust monsters restricted to rustprone iron and rustproof iron spit out (`nethack-c/upstream/src/eat.c:91`, `nethack-c/upstream/src/eat.c:104`, `nethack-c/upstream/src/eat.c:2733`, `nethack-c/upstream/src/eat.c:2876`, `nethack-c/upstream/src/eat.c:3517`). JS inventory eating advertises and accepts food/corpses/tins only, with metallivory currently used for tins but not ordinary metal objects (`js/cmd.js:7454`, `js/cmd.js:18667`, `js/cmd.js:51402`, `js/cmd.js:53083`).
- Directed doppelganger/cant-revive statue animation remains missing. C routes unique no-traits statues through `cant_revive()` to a doppelganger, then directs it into the original form via `newcham()` (`nethack-c/upstream/src/read.c:3112`, `nethack-c/upstream/src/read.c:3130`, `nethack-c/upstream/src/trap.c:746`, `nethack-c/upstream/src/trap.c:773`, `nethack-c/upstream/src/trap.c:781`). JS currently defers unique/no-corpse/cant-revive floor spell statues and statue traps directly `makemon()` their stored monster data without the directed doppelganger path (`js/cmd.js:12593`, `js/cmd.js:12797`, `js/cmd.js:17777`).
- Remaining monster-thrown `drop_throw(ohit)` work is unchanged: hit-state propagation, hit-only egg deletion, missile mulch RNG, passive object effects, and target-square refactors remain separate from the already-covered pre-shipping pie/venom break gate.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern='upward hero-thrown ordinary corpse|upward hero-thrown heavy ordinary corpse' test/shop-billing-helpers.test.mjs` - 4 pass, 916 skipped.
- `node --test test/shop-billing-helpers.test.mjs` - 920 pass.
- `npm run score` - 44/44 pass.
