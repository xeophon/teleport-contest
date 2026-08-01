# Findings: seed9006-minetown-shops

## What the session covers (ground truth, recorded with C recorder)

Wizard "Miner" (neutral), seed 9006, datetime 20260720093000:

- `#wizwish` 1000 gold pieces (wish flow, gold into purse).
- `^V` + `?` menu levelport to `minetn` (menu page 2, letter `w`).
  NOTE: name-typed ports only work within the current branch in C
  (`dlev_in_current_branch`, dungeon.c:2087); `minetn` is in the mines
  branch, so a *name* port from Dlvl:1 legitimately fails — the original
  stub `seed9006-arrive-minetown` silently showed the hero still on Dlvl:1
  because "minetown" is not even a valid level name (correct proto name is
  `minetn`, dungeon.lua). The stub recipe+recording were fixed to use the
  wizard `?` menu, which bypasses the branch check (`force_dest`).
- `#wizmap` map reveal.
- `^T` wizard position-teleport to the door of Izchak's lighting store
  (minetn-3 "Alley Town" variant, map h-flipped).
- Bump door twice: "The door resists!" then "The door opens."
- Enter: `"Hello, wizard!  Welcome to Izchak's lighting store!"--More--`
- Step over 13zm candle, then onto an 18zm candle; `,` pick up:
  `"For you, most gracious sir; only 18 zorkmids for this candle."`
  then `o - a candle (unpaid, 18 zorkmids).`
- `^T` out of the shop with the unpaid candle → THEFT:
  `You escaped the shop without paying!` /
  `You stole 18 zorkmids worth of merchandise.  An alarm sounds!` /
  `You hear the shrill sound of guards' whistles.` (+ Keystone Kop
  spawns; a Kop hits the hero once; angry Izchak zaps a wand ("Boing!",
  resisted via cloak of MR)).
- `^T` back into the shop, `#pay` while angry:
  `Izchak is after blood, not gold!` /
  `But since his shop has been robbed recently,` /
  `you compensate Izchak for his losses.  Izchak calms down.` /
  `The Kops (disappointed) vanish into thin air.`
- `,` pick up a 24zm candle; `#pay` (menu-style billing "Pay for which
  items?" → select `a` → Enter): `You bought a candle for 24 gold
  pieces.` + `"Thank you for shopping in Izchak's lighting store."`
- `d` drop the now-owned candle → sale offer:
  `Izchak offers 5 gold pieces for your candle.  Sell it? [ynaq] (n)`
  → `y` → `You sold a candle for 5 gold pieces.`
- Final: $963 (1000-18-24+5), HP 10(12), T:13.

Coverage: wish/gold, menu levelport, wizmap, wiz-teleport+getpos,
door open, shop greeting, price quotes, unpaid pickup, teleport-theft
(`u_left_shop`/`rob_shop`/`call_kops`), Kop combat + shk wand use,
angry-shk `#pay` compensation (`make_happy_shk`), menu-driven billing
payment, drop→`sellobj` sale offer.

## Final JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9006-minetown-shops.session.json`
**FAIL — RNG 3836/7003, Screens 31/111 (cursors 47/111).**

## Divergence 1 (root cause): splevTrap WEB flag inverted

First RNG mismatch, flat index 3601 (during minetn-3 level-gen):

```
[3600] C:  rnd(25)=18 @ traptype_rnd(mklev.c:1941)
[3600] JS: rnd(25)=18
[3601] C:  rnd(25)=23 @ traptype_rnd(mklev.c:1941)   <<< C re-rolls
[3601] JS: rnd(4)=2                                 <<< JS does victim roll
[3602] C:  rnd(25)=12 @ traptype_rnd(mklev.c:1941)
[3603] C:  rnd(4)=3  @ mktrap(mklev.c:2137)
```

C rolled trap type 18 = WEB, and re-rolled because
`traptype_rnd` (mklev.c:1938) returns NO_TRAP for WEB at level < 7
(minetown is lvl 6). The C's `des.trap()` default (`spider_on_web=1`,
sp_lev.c lspo_trap) yields `mktrap_flags = 0`, so the WEB exclusion
applies and C re-rolls (next roll 23 = VIBRATING_SQUARE, also NO_TRAP,
then 12 = SPIKED_PIT accepted).

The JS placed the same des.trap via `splevTrap` (js/mklev.js:17188):

```js
do { kind = traptype_rnd(true); } while (kind === NO_TRAP);
```

`traptype_rnd(true)` = `noSpiderOnWeb = true`, which neutralizes the
`lvl < 7` WEB exclusion — the JS accepts WEB everywhere. So the JS
inverted the des.trap spider_on_web default: C's default is
mktrap_flags=0 (WEB rejectable at lvl<7), JS passes NOSPIDERONWEB=true
(WEB always allowed). One wrong boolean constant; everything downstream
desyncs (all subsequent level-gen, the whole shop scenario).

Suspect: `splevTrap` in `js/mklev.js` (line ~17188).
Fix area: pass `false` (or the des.trap `spider_on_web` option mapped
with the same polarity as C's `!spider_on_web → MKTRAP_NOSPIDERONWEB`).

## Divergence 2 (also known, from the 9006-arrive stub): priestini placement

The re-recorded stub `seed9006-arrive-minetown.session.json` (no wish,
so different RNG alignment) gets further and diverges at flat index 4648:

```
[4648] C:  rn2(8)=2  @ priestini(priest.c:229)
[4648] JS: rn2(21)=17
```

C's `priestini` (priest.c:229) rolls `rn2(N_DIRS)` (=8) for the priest's
placement direction inside mktemple (minetn-3 has a temple). The JS rolls
rn2(21) instead — its temple-priest creation (mktemple/priestini
equivalent in js/mklev.js) performs different/extra rolls before the
placement-direction roll. Independent of divergence 1 (the stub gets
past the splevTrap point because its no-wish RNG alignment doesn't roll
a WEB there).

## Suggested fix areas

1. `js/mklev.js` `splevTrap`: fix the `traptype_rnd(true)` polarity to
   match C's default `mktrap_flags=0` (re-roll WEB/STATUE_TRAP/POLY_TRAP/
   FIRE_TRAP etc. under the same level conditions).
2. `js/mklev.js` temple priest creation (`mktemple`/`priestini`
   equivalent): match C's roll order (rn2(8) direction scan first).
3. After fixing, re-score; the shop-flow steps (#pay menus, theft,
   sellobj) then become comparable for any remaining divergences.


---

## Wave-6 continuation (2026-08-01) — current status: PARTIAL

State: **RNG starts diverging at flat 6522/7003 (step 88, teleport-into-shop
turn), Screens 69/111, cursors 101/111** (runner: RNG 6660/7003 matched).

### What got fixed this wave

1. **Monster wand-of-striking zap gating** (`js/allmain.js` ~4802): the bespoke
   striking-wand zap previously fired whenever the monster was lined up with
   its believed hero position, consuming the whole turn *before* movement.  In
   C, `use_offensive()` (muse.c:1824) runs only from `mattacku()`
   (mhitu.c:758-761), which `dochug()` reaches in PHASE FOUR
   (monmove.c:960-971) — the monster first takes the PHASE THREE movement
   attempt unless it believes the hero adjacent (monnear, mon.c:2476-2483).
   Without the gate, step-88 Izchak zapped *instead of moving*, desyncing the
   whole stream.  Now gated on `perceivedNearby && !mflee && !mconf && !mstun`.

2. **In-shop `rn2(25)` parity roll now unconditional for the shk_move() return
   -1 case** (`js/allmain.js` shk/priest block): a following angry keeper
   (udist>4, no billct) still standing in a shop room always passes through
   `m_search_items()`'s "in shop, usually skip" rule (monmove.c:1353-1356).
   The prior `appr !== 1 || !inLine` suppression skipped the roll when the
   keeper was lined up and in throw range; the C recording rolls it anyway in
   this scenario (step 80 and step 88).

3. **mtrack parity plumbing**: `mon_track_add()` (monmove.c:2062) only runs in
   generic `m_move()` — added the equivalent `updateMonsterTrack()` call for
   the angry-following keeper's committed move (`inShkGenericMMove` gate:
   `isshk && !mpeaceful && following && !billct && udist>4`); peaceful keepers
   (move_special) and priests (pri_move) intentionally excluded.

4. **getpos cursor auto-describe names objects** (`js/cmd.js`
   teleportCursor direction handler): C's `getpos.c:865-867 auto_describe()`
   -> `do_screen_description()` (pager.c) describes the glyph actually shown;
   the previous port described terrain only.  Seen-or-remembered object
   glyphs now describe as "a candle"/"7 candles" — fixes steps 86-87.

### Remaining divergences

- **rng[6522] (step 88)**: C rolls `rn2(16)=1 @ m_move(monmove.c:1963)` — the
  mtrack-avoidance roll (`rn2(4 * (cnt - j))`) — immediately after Izchak's
  `rn2(25)` shop-skip.  `4*(cnt-j)=16` needs `cnt-j=4`, but Izchak at (24,8)
  (shop SW corner) has at most 2 mfndpos candidates ((23,7) Kop-occupied is
  not enumerable: mm_aggression/mm_displacement both 0 for shk-vs-kop; the
  open door (23,9) is excluded by the diagonal-door rule, mon.c:2205-2219).
  Source reading says this roll cannot come from Izchak at (24,8) via the
  shk_move -1 path; the most likely explanation is a subtle positional or
  order difference inside step 88's monster sweep that the flat trace
  cannot pin down (the canonical session.json is authoritative; rebuilding
  the local recorder binary diverges from it at dungeon.c init roll #202 —
  the recorder *patches* series in nethack-c/patches/ evidently evolved since
  the canonical recordings were made, so live C reproduction is not currently
  possible).  All downstream rolls (63% of stream) shift accordingly.

- **Screens 61, 62-77, 88+**: (a) step 61: C's getpos '.' keeps the
  auto-describe topline ("dark part of a room") after a silent teleport;
  JS clears it.  (b) the small mimic @ (21,12) shows its fake ']' on JS
  screens 62-77 but C shows remembered floor; C memory semantics for
  `M_AP_OBJECT` monsters only populate `levl[y][x].glyph` when
  PHYSICALLY_SEEN — a ported memory model would need to distinguish
  wizmap-revealed terrain from actually-seen mimic objects, which current
  JS conflates via a distance-<=2 remember-cheat (see prior attempt notes).
  (c) 88+ all cascade from the rng[6522] desync.

### C refs proving the current behavior

- `use_offensive` from mattacku only: src/mhitu.c:758-761, museumuse
  muse.c:1824; dochug phase ordering monmove.c:690-971.
- in-shop rn2(25): monmove.c:1353-1356.
- shk_move return -1: shk.c:4880-4948; m_move dispatch: monmove.c:1805-1827.
- mon_track_add only in m_move commit: monmove.c:2062 + 76-86.
- m_move choice keeps running-best (first-wins): monmove.c:1965-1989
  (`nidist = ndist` inside the acceptance branch).
