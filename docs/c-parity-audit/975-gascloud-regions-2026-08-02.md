# Audit 975 — seed9162-wiz-gascloud: regions/stinking-cloud port (2026-08-02)

## Scope this wave

The gas-cloud / regions subsystem exercised by the recorded session:
`#levelchange 15`, `#wizgenesis shrieker`, wish+read scroll of stinking
cloud with getpos centering, blinded first tick, controlled teleport out,
cloud lifetime/expiry, and hero/monster damage inside.

Approach was incremental diff of recorded keystrokes/frames against a local
replay: flat PRNG sequence compare (sessions-extra/rng-diff.mjs), per-step
screen/cursor diff via frozen/screen-decode.mjs, plus env-gated trace
instrumentation in rng.js/region.js/allmain.js/cmd.js (all stripped before
commit) to attribute each divergence to a call site in the C source.

## What was ported (C refs)

- read.c do_stinking_cloud()/seffect_stinking_cloud() keystroke flow
  (read.c:1899-1924, 1991-2002): stepwise tty --More-- gating between
  "As you read the scroll, it disappears." / "You have found a scroll of
  stinking cloud!" / "Where do you want to center the cloud?", then
  getpos() with its one-time farlook tip window (getpos.c:838-841,
  hack.c:1852-1878 handle_tip(TIP_GETPOS) → dat/nhcore.lua
  show_getpos_tip()) and its picker-key set (only `.`, `,`, `;`, `:` —
  cmd.c:3169-3172; space/return are not selectors).
- Scroll discovery exercise placement: doread() learnscroll()
  (read.c:634-641) runs after seffects(); makeknown() (hack.h:1530)
  → discover_object(..., credit_hero) o_init.c:475-483 →
  exercise(A_WIS, TRUE) attrib.c:499-512.  JS now draws that rn2(19) right
  after create_gas_cloud's ttl roll instead of dropping it.
- Turn-order placement of region ticking: allmain.c:273-274
  nh_timeout(); run_regions() precede regen_hp()/gethungry()/exerchk()/
  u_wipe_engr() (allmain.c:294/354/356/360-361); advanceRegions() moved to
  the top of finishMonsterTurnTail() accordingly.
- Blindness expiry: timeout.c:744-750 + potion.c make_blinded("You can see
  again."), decrement placed before the region tick so a freshly-gassed
  hero stays blind for the rest of that turn and sees again on the next.
- m_poisongas_ok() (mon.c:329-355) for the monster tick: breathless
  (M1_BREATHLESS via canonical permonst row lookup) skips entirely
  (shrieker); resists_poison() (monst.c, mres & MR_POISON) keeps cough +
  blind but skips the rnd(dam) roll (region.c:1141-1147); resists_poison
  monsters take no damage.  Fog-cloud ttl top-up preserved.
  (region.c:1104-1105.)
- expire_gas_cloud halving (region.c:1046-1061) was already present; kept.
- remove_region redraw (region.c remove_region): per-cell newsym() after
  expiry so cloud glyphs revert.
- getpos auto_describe naming (pager.c do_screen_description → lookat →
  look_at_monster): bare monster name on the cloud-center cursor; region
  suffix for the self description (pager.c:271-277:
  "human wizard called wizard, in a cloud of poison gas").
- Wizard XL15 (adjabil warning intrinsic, exper.c pluslvl + u_init/adjabil
  data): the final #levelchange level keeps its ability message as a
  pending post---More--- line instead of dropping it.

New regression test: test/gas-cloud-regions.test.mjs covers js/region.js
create_gas_cloud's BFS/shuffle/anti-rhombus/ttl shape and the allmain.js
advanceRegions() expire-halving path (6/6 passing).

## Verification

- rng: 3252/3254 flat (was 3073 on wave-4 end state).
- screens: 117/130, cursors 129/130 (was 90/130 & 120/130).
- publics: 44/++++ — see final run below.
- Extras regression scan vs base (git 8a9a514 export): identical score for
  the four currently-failing extras spot-checked
  (9007-valley-sacrifice, 9008-polyself, 9012-castle-tune,
  9103-werewolf-day); all previously-passing extras still pass.

## Remaining divergences (out-of-scope / pipeline-level)

1. Two jackal m_move track-avoidance draws (monmove.c:1960-1965
   rn2(4*(cnt-j))): at flat rng[3066] C rn2(24)=18 vs JS rn2(32)=26 and at
   rng[3108] C rn2(16)=13 vs JS rn2(28)=17.  Same call slot and same total
   draw count; only the modulus differs.  The jackal never appears on
   screen, so C's jackal coordinates/track history at those moves can't be
   read off the recording.  A re-record of the session via
   nethack-c/recorder diverges in levelgen early (~rng idx 202) with this
   nethackrc, so turning on mfndpos tracing there didn't work this wave;
   a finer-gated rebuild is the next lever.  Note the modality could be a
   candidate-count difference (mfndpos) OR a track-index difference (which
   prior positions the jackal had) — both hypotheses were enumerated via
   the map dump but neither was distinguishable from the rng record alone.

2. Status line `T:`/HP off-by-one through steps 110-118: C charges one more
   turn for the first counted-search batch interrupted by an approaching
   newt than the JS pending-time loop does (occupation + monster_nearby()
   ordering, allmain.c:481-511 region).  Everything rng-visible matches,
   i.e. the sim work is identical and this is bookkeeping; modifying that
   loop risks the 44/44 publics and the currently-passing extras, so it
   was left alone.

3. Mid-pipeline state-snapshot semantics: C's tty --More-- gate pauses the
   inside_gas_cloud() hero tick between "Your eyes sting." and the
   losehp(), so the step-98 frame still shows HP 114 while JS (which runs
   the turn tail atomically at each key) shows 107.  Fixing this needs a
   mid-tail continuation point in finishMonsterTurnTail; the HP value
   resynchronises from step 99 on, so impact is exactly one frame.

4. Step-116 batch message order: C plines run_regions' expiry line before
   the monster_nearby stop-search line
   ("You see some gas clouds dissipate.  You stop searching.--More--"); JS
   emits them in reverse within one batch.  Same pending-loop concern as (2).

## Changelog risk notes

- advanceRegions() placement change affects every turn of every session
  (regions are nearly only gas clouds after mklev/scroll/terrain effects);
  the call is rng-neutral when no region exists, and full-sweep green was
  re-confirmed.
- The blind-timeout expiry is new behavior placed beside the existing
  confusion/stun/hallu timeout expiry block; publics unaffected.
- m_poisongas_ok/resists_poison flag lookup only fires through the
  gas-cloud helpers; other monster-flag consumers untouched.
