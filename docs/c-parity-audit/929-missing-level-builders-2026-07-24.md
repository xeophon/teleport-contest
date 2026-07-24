# Missing Special-Level Builders: earth, water, astral, knox, fakewiz1/2, tut-2

Date: 2026-07-24

## C Reference

- `nethack-c/upstream/src/mklev.c:1269` (`makelevel`) routes special levels to `makemaz(slev->proto)`; `nethack-c/upstream/src/mkmaze.c:1188` runs `load_special()`, which interprets the Lua script and then performs the post-script sequence: `link_doors_rooms`, `remove_boundary_syms`, `map_cleanup`, `wallification(1, 0, COLNO - 1, ROWNO - 1)` (when not `corrmaze`), `flip_level_rnd(allow_flips, FALSE)` (`nethack-c/upstream/src/sp_lev.c:482`), `count_level_features`, `solidify_map()` (only with the `solidify` level flag), `fixup_special()` (`nethack-c/upstream/src/mkmaze.c:570`), and finally `level_finalize_topology()` (`nethack-c/upstream/src/mklev.c:1544`) with its `mineralize(-1, -1, -1, -1, FALSE)` (kelp before all level checks, gold/gem seeding skipped for endgame, Gehennom, and non-oracle special levels).
- `nethack-c/upstream/src/nhlua.c:2295` (`nhl_init`) loads `dat/nhlib.lua`, whose `shuffle(align)` consumes `rn2(3)` + `rn2(2)` before every level script (`math.random(n) = 1 + nh.rn2(n)`, `math.random(a, b) = a + nh.rn2(b + 1 - a)`, `percent(t) = nh.rn2(100) < t`).
- `nethack-c/upstream/src/sp_lev.c:2982` (`splev_initlev`): `solidfill` consumes one `rn2(2)` for random lit state; `mazegrid` is deterministic.  Map placement for `halign/valign = "center"` (`sp_lev.c:6193` through `6224`) is `2 + ((maze_max - 2 - size) / 2)` rounded up to odd, which puts the 76x20 earth/knox/water maps and the 75x20 astral map at (3,1), the 9x9 fakewiz map at (35,7), and the 14x8 tut-2 map at (33,7).
- `nethack-c/upstream/src/sp_lev.c:3214` (`lspo_monster`) + `sp_lev.c:1925` (`create_monster`): named monsters consume the gender `rn2(2)` during argument parsing (`find_montype`) unless the species is single-gender, then `sp_amask_to_amask(AM_SPLEV_RANDOM)` -> `induced_align(80)` (`nethack-c/upstream/src/dungeon.c:1999`) consumes `rn2(3)`; class monsters consume `rn2(3)` before `mkclass(class, G_NOGEN)`; explicit `align=` monsters go through `mk_roamer()` (`nethack-c/upstream/src/priest.c:724`) with no align roll.
- `nethack-c/upstream/src/sp_lev.c:1812` (`create_trap`) + `nethack-c/upstream/src/mklev.c:2036` (`mktrap`): explicit-type traps consume the "dead predecessor" `rnd(4)` victim roll during level creation; only non-pit, non-board, non-rust, early-type traps actually get a victim (land mines become seen pits).
- `nethack-c/upstream/src/sp_lev.c:5472` (`lspo_levregion`) and `sp_lev.c:5443` (`lspo_teleport_region`) only register regions; the RNG-consuming `place_lregion()` calls (`nethack-c/upstream/src/mkmaze.c:356`, `rn1` per coordinate) happen inside `fixup_special()` in registration order after the level flip, and `flip_level()` flips the registered regions first (`sp_lev.c:697` through `720`).  Water/air planes run `setup_waterlevel()` (`mkmaze.c:1812`) at the top of `fixup_special()`, before lregion placement.
- `nethack-c/upstream/src/sp_lev.c:5584` (`lspo_region`): ordinary non-irregular non-arrival regions only call `light_region()` (no room); irregular regions flood-fill via `flood_fill_rm()` (`nethack-c/upstream/src/mkmap.c:153`) then `add_room()`; `filled=1` rooms are filled later by `makelevel()`'s `fill_special_room()` loop (`mklev.c:1416`) in room creation order; on maze levels `fill_zoo()` reuses an explicitly placed throne instead of rolling for one (`nethack-c/upstream/src/mkroom.c:288` through `298`).
- `nethack-c/upstream/src/sp_lev.c:2446` (`create_altar`) with `type="sanctum"` calls `priestini()` (`nethack-c/upstream/src/priest.c:220`): `rn2(8)` direction seed, `MM_EPRI` makemon, `rn1(3, 2)` spellbooks, `rn2(2)` robe curse check; the Amulet of Yendor is only stocked on the Sanctum level itself.
- Level scripts ported: `nethack-c/upstream/dat/earth.lua`, `water.lua`, `astral.lua`, `knox.lua`, `fakewiz1.lua`, `fakewiz2.lua`, `tut-2.lua` (plus `dat/nhlib.lua` `hell_tweaks` for the fakewiz tower surroundings).

## JS Parity Slice

- `js/mklev.js` gains `make_earth_level`, `make_water_level`, `make_astral_level`, `make_knox_level`, `make_fakewiz1_level`, `make_fakewiz2_level` (shared `make_fakewiz_level`), and `make_tutorial2_level`, all written in the established hand-translation style of `make_fire_level`/`make_air_level`/`make_wizard1_level` and wired into `mklev()`'s special-level dispatch by name (`earth`, `water`, `astral`, `knox`, `fakewiz1`, `fakewiz2`, `tut-2`).
- Shared `spDes*` helpers mirror the C `des.*` handlers' RNG contracts: fixed-coordinate named/class monsters (gender roll, `rn2(3)` induced align, `enexto` relocation, `peaceful = 0` handling), fixed-type traps with the `rnd(4)` victim roll, `get_location()` random DRY placement, rectangular and irregular (`flood_fill_rm` scanline) regions, `sel_set_door` with `set_door_orientation`, `sel_set_wall_property` (stone/wall/tree/bars only), and `selection_rndcoord` x-major pick-and-remove.
- Earth: solidfill + 76x20 map, x-major `replace_terrain` with per-stone `rn2(100) < 5`, 62 scripted monsters (27 hostile earth elementals, male-fixed `Elvenking` with no gender roll), one random-location boulder, and the flipped `air` portal levregion placed by `place_lregion` after the flip.
- Water: solidfill + all-water map, 60 monsters (including four `;` class picks through a new `WATER_EEL_ROWS` row override, since the JS common-monster table has no `S_EEL` rows; rows are in `monsters.h` array order with `G_NOGEN` allowed exactly like C's `mkclass(class, G_NOGEN)`), water-level bubble setup ported from `setup_waterlevel()` (`10 + rn2(10)` / `4 + rn2(4)` skips, `rn2(7)` masks, no `rn2(6)` cloud check), and the flipped `astral` portal.
- Astral: wing-opening `percent(60)` pairs with `4 + rn2(6)` Angel/roamer packs placed via selection `rndcoord`, three lit irregular courts, three temples, three sanctum altars with alignment-shuffled high priests (full `priestini` roll sequence), nine doors, nondiggable/nonpasswall wall property, Moloch's horde plus Rider selection consumption (Pestilence, Death, Famine from the shared 3-point selection), the 36-roamer aligned horde, nine class nasties, and `solidify_map()` applied after the flip with the unflipped `SpLev_Map` markers (C quirk preserved).
- Knox: solidfill + fort map, Croesus/secret-door/vault-entrance `percent(50)` rolls in script order, y-major treasury iteration (`600 + rn2(301)` gold, `rn2(3)` trap gate, `rn2(3)` spiked-pit-vs-land-mine), corner-tower lit selections, irregular zoo and barracks, arrival room, unlit-workaround regions, 11 doors, scripted soldiers/lieutenant/stone giant/dragons/eels, 12 corner gems, flipped branch portal at the levregion point, then `fill_special_room` in creation order with the maze-level throne reuse in a local `knoxFillCourt` (C `fill_zoo` COURT case), and kelp-only mineralize for the moat.
- Fakewiz1/2: `mazegrid` init (no lit roll), centered 9x9 tower, `mazewalk(08,05,"east")` + `fill_empty_maze`, fakewiz1-only irregular arrival region and `wizard3` portal, fakewiz2-only random amulet, `hell_tweaks` over the grid-minus-tower protected area, then stair-up/stair-down/branch (and portal) levregions placed after the flip in registration order.
- Tut-2: solidfill, 14x8 room, grown lit selection, upstairs at the scripted cell, burn engraving `Use '<' to go up the stairs` (`nowipeout`), seen magic portal, whole-level nondiggable, and no flip rolls (`noflip`).
- The wizard-mode `^V` levelport target table in `js/cmd.js` already covered `knox`, `astral`, `water`, `earth`, `tut-2`; arrival placement flows through `u_on_rndspot()` onto the updest/dndest regions the new builders register, verified end-to-end via `finishLevelTeleport()` for all five targets (fakewiz1/2 are reached by stairs/portal, same dispatch).

## Tests

- `earth plane builds cavern topology with portal to air and a stable RNG log`
- `water plane floods the map, makes bubbles, and portals to astral`
- `astral plane creates three sanctum altars with high priests`
- `Fort Ludios builds the fort with Croesus, treasury gold, and branch portal`
- `fakewiz1 builds the fake tower with stairs, arrival room, and portal to wizard3`
- `fakewiz2 mirrors fakewiz1 but with a random amulet and no portal`
- `tut-2 builds the lit exit room with upstairs, burn message, and seen portal`
- `special level builders are deterministic per seed for topology and RNG log`

Verification:

```sh
node --test test/special-levels.test.mjs
bash frozen/score.sh
```

Result: all 8 special-level tests passed; public session score stayed 44/44.

## Remaining Gaps

- No public session reaches any of these seven levels, so parity is proven by C-source tracing plus deterministic topology/RNG-log assertions, not by recorded-screen comparison.  The shared `flipSpecialLevelRnd`/`getLevelExtendsForFlip` helper is exercised by session-verified builders (castle and others), but its maze-grid extent path (wizard1-3, fakewiz) has no session coverage either.
- `movebubbles()` still only animates the Plane of Air; the water plane gets correct creation-time bubbles (`_waterBubbles`) but no per-turn bubble drift, container pickup, or hero suction (C `mv_bubble` water branch), and `water_friction()` is unported.
- `des.message()` level-entry messages (earth/water/astral) are not displayed; the pre-existing air builder has the same gap (`lev_message` is not modeled anywhere in the JS tree).
- The fire plane portal levregion is still a roll-burning stub (`rn2(79)`/`rn2(20)` without creating the portal trap) — pre-existing behavior outside this slice.
- Magic-portal arrival on levels that have their own exit portal places the hero on that trap rather than on the saved teleport region (pre-existing JS portal-arrival behavior, not changed here).
