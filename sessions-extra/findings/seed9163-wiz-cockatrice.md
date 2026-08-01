# seed9163-wiz-cockatrice — findings

## What the session covers

Cockatrice delayed stoning, cured and lethal, at a NEW MOON
(datetime 20260812120000 — every hiss stones; 5.0 removed the
lizard-corpse new-moon override):

1. greeting --More-- for "Be careful!  New moon tonight."; `#levelchange 15`.
2. `#wizwish lizard corpse` (o); `#wizgenesis cockatrice` (adjacent).
3. Search spam beside the cockatrice: bite/peck/touch melee anatomy,
   T:7 touch → "You hear the cockatrice's hissing!" → Stoned status +
   countdown stage 5 "You are slowing down." (mhitm_ad_ston: !rn2(3) hiss,
   NEW_MOON → do_stone_u → make_stoned(5L)).
4. CURE: at stage 4 ("Your limbs are stiffening.", T:8) eat the lizard
   corpse: "This lizard corpse tastes okay.  You feel limber!" +
   "You stop eating the lizard corpse." (partly-eaten corpse retained).
5. Second hiss at T:11 → FULL countdown to death: stage 4 stiffening (T:12),
   stage 3 "Your limbs have turned to stone." + nomul(-3) paralysis (T:13),
   stage 2 "You have turned to stone." (T:14), stage 1 "You are a statue."
   (T:15) → death → wizard "Die? [yn]" → space accepts default n →
   "OK, so you don't die.  You survived that attempt on your life."
6. Third hiss/countdown (T:17+) ends the recording exactly on
   "You are a statue.--More--".

Recorded with seed 9163 (new-moon datetime). 151 steps, ends T:21;
recorder exits cleanly.

## Final JS score

→ **FAIL — RNG 2440/3076, Screen 78/151 (cursors 111/151)**.
Matches levelchange, level-15 rolls, wish dialogue typing, etc.

## Divergence (RNG index 2426, input step 55) — wish-delivered corpse

At the '#'... no — at the wizwish('\n') delivery of the lizard corpse:
C rolls `rn2(1)=0, rnd(2), rn2(3), rn2(5), rn2(7)`; JS rolls
`rnd(2), rn2(3), rn2(5), rn2(7), rn2(8)` — JS is missing C's leading
rn2(1) dummy roll and appends an extra rn2(8) at the end of the
mksobj(CORPSE) generation sequence.
Gap guess: JS mksobj corpse branch (corpse age/spe/randomization
bookkeeping) omits C's leading rn2(1) and adds a trailing rn2(8)
(corpse-specific weight/freshness roll misordered).
