# Audit 936 - Levelgen Roll Fixes: splevTrap WEB Polarity, priestini/lregion Order, ensure_way_out, premapped Boulders, Stair Direction

Date: 2026-07-24. Scope: three assigned levelgen divergences plus the
follow-on bugs they exposed while bringing `seed9005-arrive-sokoban` and
`seed9006-arrive-minetown` to full RNG parity with the C recordings.

Sessions exercised:
- `sessions-extra/seed9005-wizard-sokoban.session.json`
- `sessions-extra/seed9005-arrive-sokoban.session.json`
- `sessions-extra/seed9006-arrive-minetown.session.json`
- `sessions-extra/seed9006-minetown-shops.session.json`

## (a) splevTrap WEB polarity (inverted)

C's `des.trap` defaults `spider_on_web = TRUE`
(`nethack-c/upstream/src/sp_lev.c:4405`), so `create_trap`
(`sp_lev.c:1835-1836`) does **not** set `MKTRAP_NOSPIDERONWEB`, and
`traptype_rnd` (`mklev.c:1975`) rejects `WEB` when `lvl < 7` and re-rolls.
The JS `splevTrap` called `traptype_rnd(true)`, i.e. as if
`MKTRAP_NOSPIDERONWEB` were set, making WEB acceptable at any depth.
seed9006-minetown-shops diverged exactly here: C `rnd(25)=18` (WEB=18,
rejected, re-roll) vs JS `rnd(4)` (accepted, moved on to the victim roll).

Fix: `splevTrap` now calls `traptype_rnd()` (no flag). Also added the
giant-spider spawn C does for `spider_on_web` webs (`mklev.c:2104`), mirroring
`mktrap_room`'s existing pattern. All 8 splevTrap call sites (minetn-2/3/4/7
random `trap()`s) share the same default flags; no other caller passed the
inverted flag.

## (b) premapped sokoban boulders not drawn

C flags every sokoban variant `"premapped"` (soko1-1.lua:7), so
`premap_detect` (`detect.c:2134-2147`) runs at level load: it maps the whole
background, **every boulder** (`map_object` for each `sobj_at(BOULDER)`), and
all traps. Those glyphs then persist (show_map_spot keeps old object glyphs).
The JS showed all 18 boulders on arrival (via the `!_hide_until_seen` rule),
but `revealLevelMap` (`js/cmd.js:13802-13804`) then set `_hide_until_seen` on
every unseen boulder during `#wizmap`, hiding 14 of 19 - the step-13
screen-only divergence in seed9005-wizard-sokoban.

Fix: mark each sokoban boulder `seen = true` at placement (all four
`make_sokobanN_level` boulder loops), matching `map_object`'s permanent
mapping. `revealLevelMap` no longer hides them; non-sokoban boulders keep the
existing hide-until-seen behavior.

## (c1) des.levregion stair placement must be deferred to fixup_special

C registers `des.levregion` during the script with **no rolls** and places
stairs only in `fixup_special` (`mkmaze.c:570+`), which runs **after** the
script content (altar -> `priestini`, doors, monsters), after wallification,
after `flip_level_rnd`, after `count_level_features`, and before
`level_finalize_topology` + `fill_special_room`. The JS placed the
minetn-1/minetn-6 stairs right after the map, so the stair-placement `rn1`
rolls fired **before** the priest's `rn2(8) @ priestini(priest.c:229)`,
shifting the whole stream (seed9006-arrive-minetown first divergence:
C `rn2(8)=2` vs JS `rn2(21)=17`).

Fix: in `make_minetn1_level` and `make_minetn6_level` the two
`place_lregion` calls moved to after `flipSpecialLevelRnd` +
`recount_level_features`, using new helper `flipLevregionCoords` to transpose
the region/exclude areas with the flip (`sp_lev.c:698-728 flip_lregions`).

## (c2) fixed-spawn monster levels: stale hpLevel constants

C's `newmonhp` (`makemon.c:1017`) always applies `adj_lev` (depth/hero-level
adjustment), even for fixed `des.monster` spawns: watchman (mlevel 6) rolls
`d(6,8)`, watch captain (mlevel 10) rolls `d(9,8)` at minetown depth. The JS
`WATCHMAN`/`WATCH_CAPTAIN` constants hardcoded `hpLevel: 9` / `hpLevel: 11`,
so `makemon` rolled `d(9,8)`/`d(11,8)`.

Fix: removed the static `hpLevel` from both constants so `makemon` falls
back to `adjustedMonsterLevel(ptr)` (the JS port of C's `adj_lev`,
`makemon.c:adj_lev`).

## (c3) ensure_way_out (inaccessibles) implemented

minetn-6.lua sets `des.level_flags("mazelevel", "inaccessibles")`, so C runs
`ensure_way_out()` (`sp_lev.c:5217-5260`) after the script: it flood-fills
from stairs/holes (empty here), finds the first `ACCESSIBLE` (typ >= DOOR)
unreached tile, and `generate_way_out_method` (`sp_lev.c:5146-5214`) tries
SDOOR by random-selection (`selection_rndcoord` descending rolls), then a
hole/trapdoor (`maketrap(x, y, rn2(2) ? HOLE : TRAPDOOR)` + `hole_destination`
`rn2(4)` chain), then an escape item. C's trace for seed9006 shows the SDOOR
loop exhausting a 643-point region (`rn2(643)..rn2(1)`) before the trapdoor.

The JS had no port at all. Implemented `wayOutAccessible`,
`wayOutFloodfill` (8-way, `floodfillchk_match_accessible` semantics),
`wayOutSelRndcoord` (x-major scan of the selection bbox, `rn2(count)`,
optional removal), `generateWayOutMethod`, and `ensureWayOut` in js/mklev.js,
and call it in `make_minetn6_level` after the monsters, before wallification
(C's `sp_lev.c:6026` order). Note: the escape-item fallback lists
`mkobj(RING_CLASS)` in place of `RIN_TELEPORTATION`, which has no JS otyp
constant yet (unreachable while `Can_fall_thru` is true; flagged for
follow-up).

## (c4) des.map 'x' is see-through, not STONE

C's `char2typ` maps `'x'` to `MAX_TYPE` ("see-through",
`nethack-c/upstream/src/nhlua.c:367`), and the map loader
(`sp_lev.c:6278-6284`) skips those cells, leaving the mines-fill terrain in
place. minetn-6.lua uses `bg="-"` (HWALL), so every `'x'` cell must keep the
cavern/HWALL produced by `mkmap`. The JS `minetn6SetTerrain` converted `'x'`
to STONE, wiping 9 accessible cavern tiles that C kept (the 643-vs-634
ensure_way_out floodfill count difference).

Fix: `minetn6SetTerrain` returns early on `'x'`. minetn-1 uses `bg=" "`
(STONE), so its `'x' -> STONE` mapping is behaviorally identical and was left
alone; no other special level uses mines-fill with a non-STONE bg plus `'x'`.

## (c5) fill_special_room must run before level_finalize_topology (in_mklev)

For special levels C keeps `gi.in_mklev = TRUE` through
`makelevel` -> `fill_special_room` (shop stocking) and only clears it in
`mklev()`'s trailing `level_finalize_topology()`. `mkobj_erosions`
(`mkobj.c:196-223`) gates its four rolls on `moves <= 1 && !in_mklev`, so C
rolls `rn2(100), rn2(80), rn2(80), rn2(1000)` while stocking at T:1. The JS
finalized first, then stocked, so `mkobj_erosion_rolls` early-returned and
skipped those rolls (seed9006 divergence at the shop-stocking stage).

Fix: in `make_minetn6_level`, the `fill_special_room` loop now runs before
`level_finalize_topology({ mineralizeLevel: false })`. (minetn-2/3/4/7 share
the same inverted order and should get the same swap in a follow-up; the
sessions I was assigned only cover minetn-1/6.)

## (c6) candle color

C's `objects.h` gives tallow/wax candles `WAX` material and `CLR_WHITE`. The
JS `object_display` lumped them into the generic tool branch (`CLR_MAGENTA`).
Fix: explicit `TALLOW_CANDLE`/`WAX_CANDLE -> CLR_WHITE` branch. This was the
last screen mismatch in the minetown candle shop.

## (c7) stair glyph direction: per-tile ladder, not the upstair pointer

C's `mapglyph` picks the stair direction from `ptr->ladder & LA_DOWN`
(`display.c:2348-2357`), so every stair tile knows its own direction. The JS
`terrainGlyph` rendered `<` only for the tile matching the single
`game.level.upstair` pointer, so the second up stair (the sokoban branch
stair on a level that also has a regular up stair) rendered `>` -
the seed9005-arrive-sokoban single-cell divergence.

Fix: `js/display.js` STAIRS case now uses `loc.ladder === 2` for `>`, else
`<` (LA_DOWN semantics), keeping the level-1 yellow tint.

## Verification

- `node sessions-extra/rng-diff.mjs sessions-extra/seed9006-arrive-minetown.session.json`:
  **no positional mismatch in all 6537 calls (C=6537 JS=6537)**.
- `node frozen/ps_test_runner.mjs`:
  - seed9006-arrive-minetown: RNG 6537/6537, Screen 15/17, cursors 16/17
    (remaining 2 screens are message-line issues in js/cmd.js - shop welcome
    line and the space-key "Unknown command" - outside levelgen scope).
  - seed9005-arrive-sokoban: **PASS** (RNG 5558/5558, Screen 19/19,
    cursors 19/19).
  - seed9005-wizard-sokoban: RNG 6438 -> 8229/8470 matched, Screen 13/122,
    cursors 120/122 (remaining divergence is `mcalcmove(mon.c:1164)` monster
    movement at step 95, outside levelgen scope).
  - seed9006-minetown-shops: RNG 3601 -> 4405/7003 (remaining `mcalcmove`
    at step 61, outside scope).
  - seed9001-wizard-dig-pilot: **PASS** (gate).
- Public `bash frozen/score.sh`: 43/44 at time of writing. The one failure
  (seed0108-wizard-extcmd-wishlist, `obj_resists(zap.c:1469)` zap-effects
  divergence at step 167) was bisected with git worktrees: it passes at
  e9d9cf1 (which contains all of this audit's levelgen work) and fails only
  from 5fe85ad ("Wave 2 ... misc effect rolls") onward - i.e. it is the
  concurrent zap-effects work in js/cmd.js / js/allmain.js, not these fixes.
- `node --test test/levelgen-rolls.test.mjs`: 8/8 pass, covering all fixes
  above plus the follow-ons (c2-c7).

## Remaining issues / follow-ups

- seed9005-wizard-sokoban step 13: one cell (35,17) where C shows a
  bright-blue boulder glyph the JS does not draw; root cause not yet
  identified (candidates: a statue/mimic glyph the JS lacks; needs C-side
  state inspection).
- seed9005-wizard-sokoban / seed9006-minetown-shops: residual
  `mcalcmove(mon.c:1164)` monster-movement divergences at steps 95/61 -
  mon.js gameplay area, other agents.
- seed9006-arrive-minetown steps 5-6: shop welcome message and space-key
  "Unknown command" message-line diffs - js/cmd.js gameplay area.
- minetn-2/3/4/7: same fill_special_room-after-finalize inversion as (c5);
  same des.levregion audit done for minetn-1 (only 1 and 6 use des.levregion).
- ensure_way_out escape-item fallback: `RIN_TELEPORTATION` has no JS otyp;
  `mkobj(RING_CLASS)` used as placeholder (currently unreachable).
- seed9005-arrive-sokoban now fully green; it is a good regression candidate
  for `sessions/`.
