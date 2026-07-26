# Audit 935 - getpos/Travel Keys, Travel BFS, kick_dumb Modulus, Shopkeeper move_special During Travel: seed9009-normal-descent to Full Screen Parity

Date: 2026-07-24 (written 2026-07-25). Scope: the getpos/travel slice of
`seed9009-normal-descent` plus three assigned parity fixes. The session went
from RNG 2678/19012, screens 1/1160 to **screens 1160/1160** (RNG matched
through flat 18912 of 19012; the residual tail is the mon_arrive gap in (g),
not a getpos/travel issue).

Sessions exercised:
- `sessions-extra/seed9009-normal-descent.session.json`
- `sessions-extra/seed9001-wizard-dig-pilot.session.json` (PASS guard)
- `sessions/seed0014-dequa-fountain-explore.session.json` (shk_move interaction, see (h))

## (a) TIP_GETPOS once-per-game tip and its --More--

Recording: step 1 `_`. C shows the travel instructions plus the one-time
`TIP_GETPOS` line only when `flags.tips` is on and the tip was not seen yet
(getpos.c:838,843), then a --More--; the instructions body itself is
verbose-gated. The JS `_` handler now gates on
`getposTipSeen() || game.flags?.tips === false`, verbose-gates the
instructions line, and emits the travelTip dismissal message identically.
Covered by every `_` step in seed9009 (the recording's repeating
`'_','x','.',' '` quadruple).

## (b) getpos mMoOdDxX jump keys + gather_locs (GLOC_EXPLORE)

C's travel cursor supports jumps to next/previous interesting spot:
`m`/`M` monsters, `o`/`O` objects, `d`/`D` doors, `x`/`X` unexplored-adjacent
(getpos.c:1011-1038 over the list built by `gather_locs`, getpos.c:511-554).
Ported as `gatherTravelLocs`/`travelLocInteresting` in `js/cmd.js` (after
`doorDescription`), plus the key branch in the travel cursor handler with the
`GLOC_*` consts. Ordering is `cmp_coord_distu` (getpos.c:311-329): Chebyshev
distance from the hero, ties by y then x, hero's own spot always first.
`IS_UNEXPLORED_LOC` is getpos.c:331-334.

Glyph note: the "covered by a monster" check must compare the displayed glyph
(`monsterGlyph`, display.js), not `mon.data.mlet` — in the JS monster tables
`mlet` can be a class-name string ("lizard"), not a one-char glyph.

Unit tests: `test/getpos-travel.test.mjs` (gather ordering, EXPLORE filter).

## (c) kick_dumb rn2(3) modulus

C's `kick_dumb` exercise/wounded-legs path rolls `rn2(3)` (dokick.c:863-878);
JS rolled `rn2(2)`. Ported the full branch: rn2(3) gate, `exercise(A_DEX,
TRUE)`/`exercise(A_STR, TRUE)` split and the wounded-legs side effects.
Found at seed9009 early combat; covered by the session.

## (d) travelPathKeys BFS restructure (hack.c:1316-1449)

The old BFS diverged from C's `findtravelpath` in several ways; the port now
mirrors it:

- wave/radius restructure: BFS from the target back to the hero, one radius
  per wave (hack.c:1316-1449).
- radius-3 deferral when expanding **out of** closed doors and boulders
  (`travelDelayOutOf`, hack.c:1375-1394; the `could_move_onto_boulder`
  giant/tiny-polyform exception is not modeled).
- seen traps and seen pools/lava are never pathed through
  (`travelAvoidsTile`, hack.c:1181-1200), with levitation/flying and
  water-walking exceptions.
- no diagonal moves into or out of a tile still holding its door
  (`travelDoorWithDoor` = `doorless_door` negated, hack.c:4062-4074; rules at
  hack.c:1139-1150 and 1208-1214; the block_door/block_entry squeeze
  exceptions are not modeled). Doorless (`D_NODOOR`) and broken
  (`D_BROKEN`) doorways stay diagonal-passable.
- removed the old monster-proximity veto: C's `test_move` ignores monsters
  for travel pathing.
- `travelStopsAfterOneStep` (hack.c:1271-1288): adjacent diagonal target from
  an intact doorway - `findtravelpath` tries the direct move first,
  `test_move` rejects it, `end_running(FALSE)` has already cancelled multi
  (hack.c:4156-4157), so travel ends after one step. Targets holding a door
  fail `crawl_destination` (hack.c:4095) and keep normal multi-step travel.

Unit tests: `test/getpos-travel.test.mjs` (16 tests: straight path, seen /
unseen trap, trap detour, pool avoid, levitation, diagonal door in/out,
doorless/broken diagonal, boulder target, stop-after-one-step, gather
ordering).

## (e) Travel/run turn-accounting and interaction fixes

- autoopen suppressed while traveling or running: `_travel_step_active`,
  `_running_continuation`, `_initial_run_command` gates (hack.c:1097-1098,
  cmd.c:5366); `_travel_step_active` wraps all three cmd.js travel-start
  rhacks and the allmain.js travel continuation.
- closed-door bump turn accounting: the bump is free EXCEPT on the first
  move of a travel command, where `dotravel_target` returns ECMD_TIME
  (hack.c:1112-1136, cmd.c:5376) - `_travel_command_first_step` flag.
- `doOpenDoorInDirection` ports the door cases of `doopen_indir`
  (lock.c:779-923): `rnl(20)` against (STR+DEX+CON)/3 with the 18-plus
  strength mapping, `exercise(A_STR, TRUE)` on resist (lock.c:904),
  trapped-door booby-trap branch (lock.c:907-911, trap.c:6694). The
  drawbridge/lootable-container cases (lock.c:841-852) are not handled.
- travel-into-visible-monster stop: no attack, turn passes (hack.c:2761-2775).
- `check_here` suppressed on every travel step including the last
  (pickup.c:701-709 nopick).
- verbose gates: named-miss "missum" needs canspotmon && verbose
  (uhitm.c:5208); "You descend the stairs." verbose-gated (do.c:1798) with a
  vision_recalc+docrt+bot fallback when suppressed.
- potion color reveal (`seeObjectsActive` in display.js): the distu<=6
  dknown reveal is gated off under Hallu/telepathy/Warning/Warn_of_mon
  (allmain.c:452-458).
- dungeon sounds no longer interrupt travel: `showSound` marks the message
  `_travel_noninterrupting_message` and the moveloop wipe keeps it while
  travel is active.
- exerchk travel gate: the attribute-exercise test loop is skipped while
  traveling (attrib.c:598-603 `!gm.multi`); the exerper part stays ungated.
- lichen attack is AT_TUCH/AD_STCK/0,0 ("touches you"); stck grab gated on
  magic-cancellation rn2(10) and `!u.ustuck` (uhitm.c:3306-3333), release
  rnd(2) + clear on kill (mon.c:3438-3466).

## (f) shk_move during travel: removal of the autoTravelFarLine hack

Recording: seed9009 steps 1141/1145. C rolls `rn2(5) @ distfleeck
(monmove.c:538)` then the reservoir `rn2(1)..rn2(5) @ move_special
(priest.c:85)`: the keeper stands at its home square (satdoor, GDIST 0), the
hero is on its row, so `onlineu(omx,omy)` is true and C does NOT take the
early `return 0` (shk.c:4978-4979); it zeroes the goal (appr=0) and wanders
inside the shop via move_special's reservoir loop (priest.c:78-85).

`onlineu` is `online2` (hacklib.c:704): same row, column, or **diagonal** -
not "same room" (an earlier note in this file's planning thread had it
wrong).

The old JS had a fixture-shaped hack (`autoTravelFarLine`, introduced for
seed0014 in 74517d1): keeper at home + hero on the same row + distance > 8 +
auto-travel active => `rn2(5); continue`, freezing the keeper. That has no C
basis and diverged at 1141/1145 (JS 1 roll vs C 6). Removed it; the
`!onlineHero` early exit remains and is the faithful `return 0` case (its
single `rn2(5)` is the distfleeck roll C's dochug makes before `shk_move`
returns, monmove.c:791 then monmove.c:1806-1809).

Also verified the JS reservoir port matches C structurally: same candidate
iteration order (x-outer, y-inner, mon.c mfndpos at 2207-2208), same
IS_ROOM/isshk filter and avoid/NOTONL skip (priest.c:79-86), same
`!rn2(++chcnt)` short-circuit. At 1141 C picked candidate index 2 of 5
(rn2(1)=0, rn2(2)=1, rn2(3)=0, rn2(4)=1, rn2(5)=4); JS now produces the
identical sequence and square.

Result: seed9009 steps 1141-1148 align (~2500 more calls), then the whole
session matches visually: **screens 1160/1160**.

## (g) Residual (out of getpos/travel scope): JS lacks mon_arrive/rloc for migrating monsters

First remaining RNG mismatch (screens unaffected): flat 18913, step 1148
tail. After the trap-door fall, C runs **7 rloc attempts** (`rnd(79)` /
`rn2(21)` pairs, teleport.c:1850-1851) placing a MIGR_RANDOM migrating
monster on the new level (`goto_level` -> mon_arrive -> rloc; the attempts
sit right after `place_lregion`/`mineralize`, followed by the deferred fall
damage `d(2,6) @ goto_level(do.c:1990)` and the new-turn upkeep). JS runs
zero rloc attempts and proceeds straight to fall damage + upkeep.

Root cause: `migrateMonsterToLevelRandom` (js/allmain.js:11907-11933) only
*queues* migrating monsters (`game.migrating_mons`, MON_MIGRATING); nothing
in the JS places them onto the arrival level - the only reader of
`migrating_mons` is the egg-timer bookkeeping at allmain.js:3987. C's
keepdogs/mon_arrive (dog.c) with its per-MIGR_-mode placement and rloc
fallback has no JS port yet. Owner: pet-migration subsystem. seed9009
screens stay 1160/1160 because the migrant lands outside every recorded
view.

## (h) Residual (other agent's in-flight area): seed0014 metallivore eat at step 655

seed0014 currently fails at step 655 (RNG 50274/59178, screens 655/714): JS
runs a metallivore floor-metal eat - `rn2(100) @
metallivoreObjectResists` (js/metallivore.js:270) + `rnd(25)` for the
left-behind rock (C mon.c:1521) - where C rolls two `distfleeck` rn2(5)s.
The draws reconcile modulo-wise (29%5=4, (16-1)%5=0), so this is a
behavioral difference (a metallivore standing on metal in JS but not in C),
not a stream skew.

Two notes for the record:

- It is **not** caused by (f)'s autoTravelFarLine removal: with the hack
  temporarily restored on the current tree, seed0014 fails identically
  (RNG 50274/59178, screens 655/714; experiment run 2026-07-25 21:27 UTC).
  The regression comes from concurrent work in the monster-feeding /
  shopkeeper-move area (metallivore.js, monster_data.js, monster-move
  restructure), which was in flight at the time of writing.
- The earlier "shop-room doorct" theory is disproved: levelgen RNG matches
  call-for-call through both shop layouts and the maps are byte-identical;
  seed9009's shopkeeper divergence was entirely the (f) freeze hack.

## Verification status (final, 2026-07-26)

- **seed9009: PASS (RNG 19012/19012, Screen 1160/1160)** —
  `node frozen/ps_test_runner.mjs sessions-extra/seed9009-normal-descent.session.json`,
  verified on `git archive HEAD` (1add271) plus this slice's complete hunk set
  (the 2026-07-26 follow-up increments 1-4 below), and earlier on the live
  working tree before the corruption incident noted there.
- `node frozen/ps_test_runner.mjs sessions-extra/seed9001-wizard-dig-pilot.session.json`: PASS.
- `node --test test/getpos-travel.test.mjs`: 16/16.
- Public suite: see the 2026-07-26 follow-up for the gate history
  (44/44 at f4bfb32; the tree-wide red later that week was bisected to
  concurrent uncommitted allmain.js work, not this slice: HEAD alone and
  HEAD + this slice's hunks both pass seed0077, working-tree allmain.js
  fails it).

## 2026-07-26 follow-up: seed9009 to FULL PASS (RNG 19012/19012, screens 1160/1160)
