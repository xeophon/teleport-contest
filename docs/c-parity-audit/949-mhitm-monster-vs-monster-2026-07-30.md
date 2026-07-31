# 949 — mhitm.c monster-vs-monster combat core (mattackm / fightm / passivemm)

Date: 2026-07-30
Worktree: /tmp/nh-mhitm; module: `js/mhitm.js`; wiring: `js/allmain.js`.

## Scope

Port of NetHack 5.0 `src/mhitm.c` monster-vs-monster combat into a dedicated
module, plus the `mm_aggression()` grant (mon.c:2384-2452) and the
`m_move_aggress()` strike site (monmove.c:2086-2126) so that hostile-vs-hostile
melee configured by C really happens on the JS side.

## Ported (js/mhitm.js)

| JS export | C origin | Notes |
|---|---|---|
| `M_ATTK_*` result bits | monattk.h:108-112 | MISS/HIT/DEF_DIED/AGR_DIED/AGR_DONE (=0/1/2/4/8) |
| `distmin`/`dist2`/`monnear` | hacklib.c, mon.c:2473-2480 | Chebyshev-1 with NODIAG grid-bug exception (hack.h:1414) |
| `helpless`, `findMac` | monst.h:251, worn.c find_mac | base ac from permonst, minus worn armor `a_ac` when present |
| `resists{Fire,Cold,Sleep,Elec,Acid,Ston,Poison}` | monst.h:272-279 (`mon_resistancebits`) | permonst `mres` + mon.{mintrinsics,mextrinsics} |
| `zombieForm`/`zombieMaker` | mon.c (zombie_form/zombie_maker) | full mlet switch; craft ghoul/skeleton exclusions |
| `mmAggression`(`mm2wayAggression`) | mon.c:2428-2452, :2384-2426 | pet-vs-pet ban first; worm/shrieker; two-way zombie pairs; mgenmklev + stronghold + unique gates. Wizard-tower floor divide unported. |
| `resistConflict` | mondata.c:1607-1612 | `rnd(20) > min(19, CHA - m_lev + ulevel)` |
| `couldSeduce` | mhitu.c:31-80 | nymph/succubus gender logic, SEDU/SITM/SSEX capability scan |
| `attkProtection` | mhitm.c:1303-1334 | W_* slot mask vs special-cases (~0L → -1) |
| `failedGrab` | mhitm.c:574-645 | unsolid targets; HUGS/WRAP/STCK/DGST |
| `noises` / `preMmAttack` | mhitm.c:24-71 | distance noises + unhide; mimic reveal is delegated |
| `missmm` | mhitm.c:75-92 | "misses"/"pretends to be friendly to" via couldSeduce |
| `hitmm` | mhitm.c:649-789 | per-aatyp verbs, seduction banter; shade_miss unported |
| `mdamagem` | mhitm.c:791-909 | bare petrification defense gateways, adtyping subset, knockback rolls, hp/death path, grow-up hook |
| `mhitmAdtyping` subset | uhitm.c:4782-4846 | PHYS/STUN/WERE/HEAL/ACID/DRST/DRCO/DRDX/FIRE/COLD/ELEC/SLEE/PLYS/DGST + default damage-0; see Unported |
| `mhitmKnockback` | uhitm.c:5247-5305 | **rn2(3)+rn2(6) preamble rolls always consumed** (parity); displacement effect not wired |
| `gazemm` | mhitm.c:443-530 | cancel/blind/perceive gates; Medusa reflection unported |
| `engulfTarget`/`gulpmm` | mhitm.c:532-687 | size/trap gates, swallow messages, position swap/restore; minliquid/mintrap hook optional |
| `explmm` | mhitm.c:689-749 | self-destruct pipeline; FIRE/COLD/ELEC go through `hooks.monExplodes` when provided |
| `passivemm` | mhitm.c:1245-1378 | full passive matrix: passive dice even when dead, ACID swim+erosion gates + `goto assess_dmg` order, ENCH break, PLYS eye/cube freeze, COLD heal, STUN, FIRE, ELEC |
| `paralyzeMonst`/`sleepMonst`/`sleptMonst` | mhitm.c:1167-1210 | incl. C's mfrozen cap 127 |
| `getmattkLike` | mhitu.c getmattk | DISE/PEST/FAMN consecutive-attack downgrade; mspec_used grab swap |
| `mattackm` | mhitm.c:194-571 | full attack loop: rnd(20+i) per melee attempt, tmp = find_mac + m_lev (+4 confused/helpless, +1 elf-vs-orc), mlstmv stamp, passive after each attempted adjacent attack, DEF_DIED/AGR_DIED/DONE termination order |
| `fightm` | mhitm.c:93-166 | resistConflict first, newest-first scan, return-attack `rn2(4)` + `movement > rn2(NORMAL_SPEED)` gate |
| `mdisplacem` | mhitm.c:170-290 | species-at-square sanity, rn2(7) failure, grid-bug diagonal rule, stone touch, square swap |
| `xdrainenergym` | mhitm.c:1382-1393 | mspec_used += d(2,2) |
| `rustm` | mhitm.c:1412-1460 | CORR/RUST/FIRE erosion-gate rolls w/ hook-based effect |
| `mMoveAggress` | monmove.c:2086-2126 | mattackm + rn2(4)/rn2(12) return-attack gate, movement spend |

## RNG-parity ordering (verified in test/mhitm.test.mjs)

- Hit: `rnd(20+i)` → `d(damn,damd)` → `rn2(3)`/`rn2(6)` (knockback
  preamble; uhitm.c:5261-5268) → passive `rn2(3)` gate.
- Miss: `rnd(20+i)` → passive `rn2(3)` gate.
- `passivemm` rolls the defender's passive dice **before** the `mdead` fork
  (mhitm.c:1255-1262), floating-eye 0d70 → `d(mlevel+1, 70)` uses the
  *permonst* level, AD_ACID runs `rn2(2)` splash then unconditional
  `rn2(30)`/`rn2(6)` erosion gates and skips the `rn2(3)` gate
  (`goto assess_dmg`, mhitm.c:1279-1282).
- `explmm`/`gulpmm`/`gazemm` consume rolls in the same spots as C; `resist`
  rolls (`rn2(100 + alev - dlev) < mr`, zap.c:5377) are kept in sleepMonst.

## Wiring

- **js/allmain.js `mfndpos`** occupant cell: changed to C's
  `flag | mm_aggression(mon, mtmp2)` union (mon.c:2301).  `mm_aggression` is
  data-level (no draws), so passing sessions' candidate lists are untouched
  whenever the extra ALLOW_M grant doesn't fire.  Squares granted this way
  get the local `MM_AGGR` marker.
- **js/allmain.js `moveMonsterTowardHero`**: when the chosen square was
  granted via `MM_AGGR` **and** the mover is not tame/pet, the strike is
  routed through the ported `mMoveAggress` (`mattackm` + return-attack gate).
  Tame/conflict paths (all bespoke blocks matched to recorded sessions) are
  deliberately untouched.
- **Hook bridge** at allmain module tail: pline/vis/canseemon, Monnam/
  mon_nam, monkilled→`monsterCombatKill` (message + inventory drop +
  corpse/glob + recordVanquished + newsym, mirroring finishPetKilledMonster),
  monstone→`stoneMonster`, growUp→`monsterGrowUp`.
- `js/mhitm.js` never imports allmain.js; all hooks are injected via
  `setMhitmHooks`.

Danger analysis: for a *passing* session, the new code can only fire when a
non-tame monster ends its mfndpos next to a monster that mm_aggression would
license — purple worm↔shrieker or zombie-maker↔zombifiable.  If that ever
happened in a passing recording, C would already have consumed draws the old
JS did not, so the session could not have been passing.  Hence the wiring is
provably screen/RNG-neutral for every session that currently passes.

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js')"` → loads OK.
- `node --test test/mhitm.test.mjs` → 18/18 (eligibility matrix, dice order,
  passive forks, petrification, engulf, seduction, displacement, return gate).
- `bash frozen/score.sh` → **44/44 passing** (all sessions, RNG and screens).
- `node frozen/ps_test_runner.mjs sessions-extra` → 9/17, identical before and
  after this change (seed9006-minetown-shops, seed9007-valley-sacrifice,
  seed9008-wizard-polyself, seed9009-normal-descent, seed9010, seed9012*
  were already failing at HEAD; none regressed).
- `node --test` on the full repo tree → no new failures
  (test/shop-billing-helpers.test.mjs has 9 pre-existing failures at HEAD).

## Unported / remains open

- `mhitm_adtyping` branches not listed above (DRLI life drain, DRIN tentacle
  brain-eat with `skipdrin`, STCK adhere/engulf-loop, SLIM slime-conversion,
  POLY monster polymorph via mon_poly(), SEDU/SITM monster theft, DREN energy
  + xdrainenergym callers, TLPT, DCAY/CORR/RUST attacker corrosion,
  DISE-vs-hero, staple mhitm die-side cases on gaze paths).  M_HITM callers
  like mhitu's DREN against mspec_used are stubbed.
- `thrwmm` (ranged AT_WEAP monster-vs-monster) and `breamm`/`spitmm`
  (AT_BREA/AT_SPIT ranged); the `AT_WEAP`/`AT_BREA` branch treats out-of-range
  as "no attack" with zero draws (documented divergence: C would call
  thrwmm()/breamm()).
- Medusa reflection chain in gazemm (`mon_reflects`, minvis/perceives
  retaliation, petrify-on-gaze).
- Judas-port `shaded` / `shade_miss` (`hitmm`).
- Weapon-augmentation in mdamagem: `MON_WEP` dmgval/artifact_hit/poison/
  rustm of attacker weapon (`mwep` is accepted but always null from current
  call sites).
- `mhitm_knockback` actual displacement (enexto / hurtle); only the draws.
- `gulpmm` minliquid/mintrap at the destination and `vampshifter` expel.
- `mdisplacem` is module-complete but not wired into the scheduler (no
  ALLOW_MDISP plumbing; displacement candidates currently exist only in the
  pet path).
- `fightm` is module-complete and has unit coverage, but the recorded-session
  conflict branch in processMonsterTurns (allmain.js:4615 area) was kept as
  the call site for Conflict-driven fights to avoid disturbing the passing
  bespoke recording parity; wiring fightm as the permanent conflict path is
  tracked for follow-up.
- `monkilled` corpse-chance inventory-rich path (echoes of mon.c:3392 full
  pipeline: worry flags, uid tracking, vampshifter release on kill).
- `mcalcdistress`-friendly passive specials (floating-eye/cube freeze from
  `passivemm` set mfrozen but JS has no per-monster decrement scheduler yet).

## Follow-up slices

1. Route the tame/conflict bespoke blocks onto `mattackm` once their bespoke
   message-more interleavings are lifted into hooks.
2. thrwmm/breamm/spitmm m-mon ranged paths.
3. mon_reflects/medusa petrify gaze, shade_miss.
4. mdisplacem ALLOW_MDISP plumbing + mm_displacement.
