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
