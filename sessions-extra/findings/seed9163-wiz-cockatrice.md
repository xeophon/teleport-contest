# seed9163-wiz-cockatrice — findings (wave-5 continuation, this worktree: slice/fin9163)

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
   corpse: "This lizard corpse tastes okay.  You feel limber!".
5. Second hiss at T:11 → full countdown; stage-3 paralysis "Your limbs
   have turned to stone." (nomul(-3)).

## Recomputed divergence on this base (was 2892/3076, 111/151 at handoff)

At handoff the first flat-RNG divergence was at flat index 2888
(recorded step 117): C got the full corpse/hiss chain right; the JS was
missing the cockatrice's SECOND attack whenever the bite's hitmsg was
deferred behind a --More--.

## Fixes this wave (all verified against 49/49 publics + extras sweep)

### 1. Deferred petrifying touch attack across the bite's --More--
(mhitu.c:767-811 mattacku() NATTK loop; monst.c PM_COCKATRICE/
PM_CHICKATRICE second attack AT_TUCH AD_STON 0d0)

When the bite's hitmsg overflowed the topline ("Your limbs have turned
to stone.  You stop searching." occupied the line), the deferred-damage
branch armed `_topline_after_more`/`_damage_after_topline_more`/
`_knockback_after_topline_more` and resumed at the NEXT monster —
silently dropping the touch attack.  C instead blocks mid-mattacku in
tty more(); on dismissal the loop continues with i=1:
rnd(20+i) to-hit (mhitu.c:806), d(damn,damd)=d(0,0) (mhitu.c:1187),
mhitm_ad_ston hiss gate rn2(3)+stoning gate rn2(10)||NEW_MOON
(uhitm.c:4215/4245), mhitm_knockback rn2(3)+rn2(6) (uhitm.c:5258/5269).

Fix: both deferred-bite sites (js/allmain.js, two branches that arm the
topline-more) now also set `_deferred_petrifying_touch_after_topline`
when the monster is a petrifying-touch species; js/cmd.js resolves it
right after the bite's deferred damage/knockback block, mirroring the
existing `_cockatrice_touch_after_more` handler (to-hit, 0d0 damage,
hiss gate + new-moon stoning wiring, knockback, topline append or
overflow queue like the raven/straw-golem cases).

### 2. Stoning-timeout death sequencing (timeout.c:137-190
stoned_dialogue + :684 done_timeout(STONING, STONED), end.c done()/die()
/savelife())

Recorded C behaviour the JS got wrong:
- done(STONING) never prints "You die..." — that string only comes from
  losehp() (hack.c:4287); the chain goes "...You are a statue.--More--"
  straight into "Die? [yn] (n)".
- The stoning death aborts finishMonsterTurnTail mid-way; after the
  wizard refusal C continues THE SAME nh_timeout()/once-per-turn tail
  (dosounds allmain.c:344, gethungry allmain.c:355, u_wipe_engr
  allmain.c:360-361) and only then starts the next movemon; savelife
  sets svc.context.move = 0 and gm.multi = -1 (end.c:726-736).
- A refused petrification stomps the stage-3 paralysis countdown and
  its nomovemsg ("You can move again." must never print), and the
  status line drops "Stone" once the intrinsic's counter expired.
- The death pass's turn increment (svm.moves++, allmain.c:243-244)
  before nh_timeout's dialogue/expiry must not be lost — its absence
  desynced the exerchk/exerper %10 gate (attrib.c:520-545/489-512) one
  turn later, misplacing the exercise(A_CON, TRUE) rn2(19) roll.

Fixes:
- armHeroDeathMore honours an empty message (skips "You die...").
- Stoning expiry in finishMonsterTurnTail marks
  `_resume_turn_tail_after_stoning_death` (instead of queueing a hp-death
  message), zeroes u.uhp NOT (die() leaves hp alone; the status redraw at
  the Die? prompt displays 0), does the lost moves++ bookkeeping at the
  arm point, clears the helpless/wake bookkeeping.
- cmd.js wizardDieConfirm refusal flips `_resume_turn_tail_now`.
- moveloop_core pass top: when armed, run finishMonsterTurnTail(true)
  (resume mode skipping the already-consumed pre-nh_timeout prefix and
  the immobile-hero cascade), then end the pass — next key goes to rhack.
- The hero's "T:" turn counter / status row realigns from that point on.

### Results
RNG: 3076/3076 (was 2892/3076) — bit-exact over the whole session.
Screens: 130/151 (was 111/151); cursors 138/151 (was 125/151).
All 49 publics still pass; all extras unchanged (verified against a
`git archive` base comparison run).

## Remaining divergences (screens only, steps 107, 135-142, 144-150)

1. Step 107, topline order: C prints "The cockatrice bites!  You stop
   searching.--More--"; JS prints the messages swapped ("You stop
   searching." first).  Cause: the counted-search occupation stop via
   monster_nearby() (allmain.c:481-511, hack.c:4103-4127) fires in a JS
   pass whose monster phase hadn't bitten yet — C's hitmu stop_occupation
   (mhitu.c:1265) lands first when the bite shares the movemon.  The JS
   engine's occupation-tick/pass ordering (tick before monsters) plus the
   `_stop_search_extra_pass` mechanism produces the swap.  Same mechanics
   correctly emit the stop-first order elsewhere (e.g. step 131 matches),
   so the divergence is pass-boundary granularity, not the roll or text
   logic.

2. Steps 135-142, 144-150: per-key packaging during the second/third
   stoning countdown (paralysis + counted search + mores interleaved).
   C's tty --More--/input-boundary structure (win/tty/topl.c
   update_topl/more; keys 136,139,140,141,... eaten silently) splits
   hero-free turns differently than the JS `_pending_time_passed`
   pipeline — JS runs one extra "[tail; then next monster phase]" packing
   boundaries per key (visible as early "The cockatrice bites!" rows at
   135-137, early stage-4 at 140, early death chain at 144-146 vs C's
   147-150, including the "T:" counter jumps C shows there).  Every roll
   matches flat; this is purely at which recorded input boundary the same
   work completes.

Neither remaining item is safe to fix locally without restructuring the
pass scheduler, which the other 49 green public sessions + 14 green extra
sessions depend on; left as documented partial — all RNG content
bit-exact.
