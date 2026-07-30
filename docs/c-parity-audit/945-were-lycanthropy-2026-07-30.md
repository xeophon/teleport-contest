# 945 — were.c lycanthropy port (wereChange / new_were / were_summon / hero cycle)

Date: 2026-07-30
Worktree: /tmp/nh-were; module: `js/were.js`; wiring: `js/allmain.js` monster-turn loop.

## Scope

Port of NetHack 5.0 `src/were.c` (239 lines) and the were-related call-site
mechanics. Upstream 5.0 has **no** `counter_polymorph()` /
`protect_from_shape_changers()` functions (those were 3.4/3.6-era were.c
helpers); in 5.0 the equivalents are `counter_were()` (were.c:48),
`were_beastie()` (were.c:70), and the `Protection_from_shape_changers`
extrinsic (include/youprop.h:355-360). All three are covered below.

## Ported (js/were.js)

| JS export | C origin | Notes |
|---|---|---|
| `WERE_SPECIES` table | include/monsters.h (beast S_RODENT:~911 / S_DOG:~220,~267; human S_HUMAN:~2609/2618/2627) | level/mmoves/mac/mr/align/difficulty per form; `attack` carries AT_BITE/AD_WERE dice (1d4 rat, 1d4 jackal, 2d6 wolf) |
| `isWereData` / `isWereHumanForm` | mondata.h:96 `is_were`, :101 `is_human` | JS flags: `were` / `wereHuman` / `wereBeast` |
| `counterWereData` | were.c:48-67 `counter_were()` | human<->beast swap, null == NON_PM |
| `wereBeastieSpecies` | were.c:70-93 `were_beastie()` | rat/jackal/wolf similarity groups |
| `nightNow` | calendar.c:214-220 `night()` | hour<6||hour>21 from recorded `_datetime` |
| `newWere` | were.c:96-139 `new_were()` | protection blocks human->beast; message "The X changes into a human|rat|jackal|wolf." gated on canseemon && !Hallucination; healmon (mhpmax-mhp)/4; helpless wake; possibly_unwield + mon_break_armor shed; onscary/were-flee rn1(9,2) |
| `wereChange` | were.c:9-44 `were_change()` | per-monster-turn shapeshift; human: `!Protection && !rn2(night ? (full?3:30) : (full?10:50))`; beast: `!rn2(30) || Protection`; unseen wolf/jackal howl + wake_nearto(4*4) |
| `wereSummon` | were.c:142-189 `were_summon()` | `rnd(5)` attempts; species chains: rat rn2(3)/rn2(3), jackal rn2(7)/rn2(3), wolf rn2(5)/rn2(2); protection blocks non-hero summons with zero draws; `yours` summons get the `tamedog` hook |
| `wereBiteInfectsHero` | uhitm.c:4265-4290 `mhitm_ad_were()` mhitu branch | rn2(4) unconditional; infection only if ulycn==NON_PM, no protection, no AD_WERE defending weapon, and survivor of negation roll rn2(10) vs 3*magicNegation (uhitm.c:75-90); message "You feel feverish."; sets ulycn |
| `setUlycn` | were.c:231-238 `set_ulycn()` | sets `u.ulycn` (-1 == NON_PM); set_uasmon intrinsic swap noted as TODO |
| `youWere` | were.c:192-211 `you_were()` | gates: Unchanging/already-were/polymorph-control query/monster_nearby; calls injected `polymon(species)` |
| `youUnwere` | were.c:213-229 `you_unwere(purify)` | purify prints "You feel purified." and cures ulycn; rehumanize unless protected by conditions; else `rn1(200,200)` tenure extension |

## Wiring

- `js/allmain.js` monster-turn loop: replaced the RNG-parity stub
  (`mon.data?.wereHuman && rn2(50)` / `rn2(30)`) with the faithful
  `wereChange(mon, { ... })` call, which C issues from
  `mon.c:1198 m_calcdistress()` for every living monster each turn.
  Hooks supplied: `addToplineMessage`, `newsym`, `canseemon` (LOS via
  `cansee`, blindness, undetected, invisible-vs-see_invisible),
  `monMoving: true`, and `onscary` (Elbereth engraving at (mux,muy)).

## RNG parity analysis

`rn2(x)` consumes one ISAAC64 draw regardless of modulus, so the moon-phase
switch between rn2(3)/rn2(30)/rn2(10)/rn2(50) preserves the recorded draw
sequence one-for-one versus the former fixed rn2(50)/rn2(30) stub. Draw
*order* matches C: the human-form branch checks
`Protection_from_shape_changers` before the roll (were.c:16), and the beast
branch rolls rn2(30) unconditionally (were.c:41). `new_were()` itself
consumes no draws (healmon/mon_break_armor are roll-free); only the rare
onscary flee path adds rn1(9,2), matching were.c:133-134.

Empirical check: session seed0116-wizard-wear-shop exercises a real
out-of-sight wererat human->rat transform (roll hits 0); the pass requires
both the silent-no-message behavior (`!canseemon`) and the '@'->'r' glyph
swap to be faithful. 44/44 passing after the port (was 43/44 with a naive
always-visible default).

## Unported / limitations (explicit)

- `were_summon` integration into monster combat (mhitu.c summonmu,
  :955-1008) — the generic were melee/summon path against the hero is not
  ported into the JS monster-attack loop; `wereSummon` is unit-tested but
  has no combat call site yet.
- Hero `#howl`-equivalent `dosummon` while in were form (polyself.c:1626-1641):
  JS has no #monster command; `wereSummon` supports it via `yours: true`.
- `mhitm_ad_were` wiring into actual were-bite damage events
  (uhitm.c:4789 dispatch): the JS adjacent-monster melee table has no were
  entries, so no live call site for `wereBiteInfectsHero` yet.
- `mhitm.c:1130-1143` monster polymorph attack on polymorphed were hero
  reaching `you_were()/you_unwere()`: hero monster-hit polymorph attacks
  are not ported.
- Periodic spontaneous `you_were()` scheduling (allmain.c:324-340,
  `rn2(80 - 20*night)`) and `gw.were_changes` gating of set_uasmon
  (allmain.c:347-350): the allmain parity loop has no such slot; documented
  here for the next pass.
- `timeout.c:645` beast-form timeout calling `you_unwere(FALSE)` and
  `pray.c:515` prayer cure calling `you_unwere(TRUE)`: prayer/polyself
  timeouts are partially ported elsewhere; hook points exist in were.js.
- eat.c lycanthropy-from-were-corpse/tin (eat.c:1324 `set_ulycn(
  catch_lycanthropy)`, eat.c:777 were-kin nutrition, eat.c:2515
  wolfsbane cure) — JS covers wolfsbane cure in cmd.js independently;
  were-js `wereBeastieSpecies` is available for the victim-kin check when
  that slice lands.
- objnam.c:5202 counter_were for naming (statue/hybrid names): not wired.
- potion.c:1844/1852 monster holy/unholy water new_were call sites are
  already modeled in cmd.js via `transformWereMonsterFromWater` /
  `WERE_WATER_FORM_DATA`; left as-is to avoid churn, semantics agree with
  were.c:103-118 (heal quarter lost hp, wake, message wording).
