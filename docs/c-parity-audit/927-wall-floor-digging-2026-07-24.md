# Wall/Floor Digging with Pick-Axe

Date: 2026-07-24

## C Reference

- `nethack-c/upstream/src/dig.c:140` defines `pick_can_reach()` — one-handed picks cannot reach statues/boulders resting in seen pits; a hero in a pit needs a two-handed tool or conjoined pits.
- `nethack-c/upstream/src/dig.c:168` defines `dig_typ()` — statue, boulder, closed door, tree (axe only), then rock for `IS_OBSTRUCTED` terrain.
- `nethack-c/upstream/src/dig.c:206` defines `dig_check()` — stairs, ladder, throne, altar, air/water plane, `W_NONDIGGABLE`, undestroyable traps, `!Can_dig_down` pit-only / destroy-trap results, boulder.
- `nethack-c/upstream/src/dig.c:254` defines `digcheck_fail_message()` with the pick `dig in` / axe `chop` verb split.
- `nethack-c/upstream/src/dig.c:299` defines the `dig()` occupation tick — per-tick dig_check/may_dig guards, Fumbling branch (`rn2(3)` gate, `rn2(3)` case pick), effort `10 + rn2(5) + abon() + spe - greatest_erosion + u.udaminc` doubled for dwarves, `>250` hole, `>50` pit, land mine / bear trap springs, destroy-trap on no-dig levels, `>100` wall/door/statue/boulder completion, otherwise the shop-wall guard and `You hit the X with all your might.` plus `wake_nearby(FALSE)`.
- `nethack-c/upstream/src/dig.c:605` defines `fillholetyp()` — moat/pool(pool/3)/lava counts in the 3x3 area with short-circuit `rn2(cnt + 1)` rolls.
- `nethack-c/upstream/src/dig.c:639` defines `digactualhole()` — furniture first, pit vs hole, `You dig a pit in the floor.`, `rn1(4, 2)` pit trapping, shop pit billing (`SHOP_PIT_COST`, `pay_for_damage("ruin")` for shop doors), fall-through with `You fall through...`.
- `nethack-c/upstream/src/dig.c:884` defines `dighole()` — boulder, grave, drawbridge, furniture, liquid fill, then pit or hole.
- `nethack-c/upstream/src/dig.c:1026` defines `dig_up_grave()` — `exercise(A_WIS, FALSE)`, role/alignment scolding, `rn2(5)` corpse/zombie/mummy/empty, terrain to ROOM, engraving removed.
- `nethack-c/upstream/src/dig.c:1161` defines `use_pick_axe2()` — up/self/horizontal/down dispatch, `Clash!` off-map, undiggable-target messages (web, bars, water/lava walls, tree, rock, unreachable statue/boulder, thin air), start vs continue via persistent `svc.context.digging`, downward pre-start guards (air/water, reach, pool/lava, axe scratch + `u_wipe_engr(3)`), shopdig warning plus `SHOP_PIT_COST` billing.
- `nethack-c/upstream/src/dig.c:1547` defines `zap_dig()` — `The door is razed!` for visible closed doors and shop door/wall billing settled by `pay_for_damage`.
- `nethack-c/upstream/src/weapon.c:950` defines `abon()` (strength tiers, `ulevel < 3` kludge, dex adjustment) and `nethack-c/upstream/src/weapon.c:993` `dbon()` for the self-hit damage.
- `nethack-c/upstream/src/attrib.c:1245` defines `acurrstr()` feeding `SHOP_WALL_DMG (10L * ACURRSTR)`.
- `nethack-c/upstream/src/detect.c:1589` defines `cvt_sdoor_to_door()` (rogue levels become doorways, otherwise closed unless locked).

## JS Parity Slice

- New `js/dig.js` ports the pure core: `digTypeOf` (dig_typ), `digCheckHero`/`digCheckFailMessage` (dig_check), `digAbon`/`digDbon` (full abon/dbon tables — the previous effort helper used strength-only tiers), `digEffortIncrement` (single `rn2(5)` per swing, dwarf doubling), `digAcurrStr`/`shopWallDamageCost`, `mayDigAt`, `fillHoleType`, `digUpGrave`, `finishWallDigTerrain` (wall→doorway/maze room/cavern corr, SDOOR→broken door, closed door break, tree cut with the `rn2(5)` fruit roll), `fractureDigBoulder` (`rn1(60, 7)` rocks), `convertSecretDoorToDoor`, `horizontalUndiggableResult`, `downDigStartBlock`, `digFumblingResult`, `wakeNearbyForDig`, and `beginDigOccupation`/`finishDigContext` mirroring `svc.context.digging` persistence so interrupted digs print `You continue ...` and keep effort.
- `js/cmd.js` `applyPickDigDirection` now routes horizontal swings through `planHorizontalDig`: `Clash!` off-map, undiggable messages (web entanglement with `d(2,2)` helplessness, `Clang!` bars, `Splash!`, tree/rock tool errors, unreachable statue/boulder, thin air), statue chipping unchanged, and start/continue occupations for rock, boulder, door and tree targets. Self-hit now includes `dbon()`. Downward digs run `downDigStartBlock` first and bill/warn in shops (`shopdig(0)` text, Knight alignment, `SHOP_PIT_COST`).
- `js/cmd.js` down-dig finishers gained the `dighole()` grave branch (pit + `digUpGrave`), fountain `furniture_handled` dry-up, `fillholetyp` liquid flooding through the shared `earthquakeLiquidFlow` path, pit shop billing, `wake_nearby` on pit creation, and `pay_for_damage("dig into")` before falling through holes.
- `js/cmd.js` wand-of-digging ray (zap.c divergence fixes only): visible closed doors now print `The door is razed!`, and shop doors/walls razored by the ray are billed (`SHOP_DOOR_COST`/`SHOP_WALL_COST`) and settled after the beam.
- `js/allmain.js` `processPickDigOccupation` (now exported) follows `dig()` order: abort guards including level change, per-tick `digCheckHero` failures for downward digs, `digHardnessBlockMessage` for petrified trees / `W_NONDIGGABLE` walls, the Fumbling branch, then the effort increment. The down branch springs set land mines / bear traps (`triggerPickDigTrapUnderHero`), chops or destroys bear traps while trapped (`rnl(7)`), destroys traps on no-dig levels with C's message, and keeps the existing pit/hole thresholds. The wall branch completes statues (existing trap/shatter code), boulders, and wall/door/tree/stone terrain; bills shop wall (`SHOP_WALL_DMG`) and door (`SHOP_DOOR_COST`) damage through `billDigShopTerrainDamage`; stops at shop walls/doors with `This wall seems too hard to dig into.`; and prints the one-shot `You hit the X with all your might.` with a wake.

## Tests

- `test/digging.test.mjs` — 25 tests: dig_typ classification, abon/dbon tables, wall dig start/progress/completion (doorway, maze room, stone corridor, secret door, closed door), shop-wall and `W_NONDIGGABLE` guards, boulder fracturing, tree-vs-pick refusal, statue chipping regression, thin air, self-hit with dbon, continue message, levitation/pool down-dig refusal, pit creation + hero trapping, hole creation + falling, dig_check on stairs/throne/altar, stairs fail message, fillHoleType, moat flooding, and grave robbing.

Verification:

```sh
node --test test/digging.test.mjs
bash frozen/score.sh
```

Result: 25/25 digging tests pass; full public score stays 44/44 (baseline re-run before and after the change).

## Remaining Gaps

- Applying a pick toward an adjacent monster does not attack it (`do_attack` in `use_pick_axe2`); the melee system is not wired to the apply direction prompt. Axes (`is_axe` tools) are also not routed to `use_pick_axe` by the apply dispatcher yet, though dig.js handles them.
- `confdir()` direction randomization when confused/impaired is not implemented for any direction prompt in the port (global gap, not digging-specific).
- Plane of Earth digging: `mkcavearea()` cave-ins and the post-dig earth elemental/xorn spawn are not ported (`Is_earthlevel` digging falls through to normal rock cutting).
- `watch_dig()` town-watch vandal warnings for wand/spell digging are not ported (no angry-guards machinery); pick digging never calls `watch_dig` in C either (it is only reached from `zap_dig`, broken wands, monster chewing, and `mdig_tunnel`).
- `digactualhole` gaps: sink and drawbridge `furniture_handled` cases, magical-trap explosion when finishing a down-dig onto one, leashed-pet fall prevention, shopkeeper pack-snatch on fall-through (`shopdig(1)`), and unearthed-object `pickup(1)`.
- `dig_up_grave` uses an approximate uniform zombie/mummy class picker instead of `mkclass()` weighting, and the grave corpse skips `tt_oname()` scoreboard naming (RNG sequence otherwise mirrors the JS `mk_tt_object` port).
- Broken-wand digging (`BY_OBJECT` digactualhole) and `mdig_tunnel()` monster digging are outside this slice.
