# Audit 982 — seed9163-wiz-cockatrice: mhitu.c touch/stoning + timeout-tail port (2026-08-02)

## Scope this wave

Wave-5 continuation of the cockatrice hissing/toppling session
(sessions-extra/seed9163-wiz-cockatrice.session.json): delayed
petrification countdown, lizard-corpse cure, wizard-mode death refusal,
all at a fixed NEW_MOON datetime so every landed hiss stones.

Handoff state was RNG 2892/3076, screens 111/151 — the base had already
shifted versus the older findings doc (previous wave fixed the wish-corpse
divergence; handoff first-mismatch was at flat index 2888 / recorded step
117).

Diagnosis method: flat PRNG prefix diff (sessions-extra/rng-diff.mjs),
per-step screen/cursor/rng-slice compare via frozen/screen-decode.mjs +
jsmain getRngSlices(), env-gated trace instrumentation (MSGTRACE,
NH_DBG_TRACE iter logs; all instrumentation removed before final commit),
C side in nethack-c/upstream (read-only).

## What was ported (C refs)

1. Petrifying-touch second attack surviving a --More-- split of the bite
   hitmsg:
   - mhitu.c:767-811 mattacku() NATTK loop ordering, AT_TUCH second slot
     (monst.c PM_COCKATRICE/PM_CHICKATRICE 0d0 touch)
   - mhitu.c:806 to-hit rnd(20+i) with i=1
   - mhitu.c:1187 hitmu() damage roll d(0,0)
   - uhitm.c:4205-4254 mhitm_ad_ston(): hitmsg first, hiss gate !rn2(3),
     the NEW_MOON / !rn2(10) delayed petrification gate
   - uhitm.c:5247-5270 mhitm_knockback(): unconditional rn2(3)+rn2(6)
     trailing rolls
   - wired as a `_deferred_petrifying_touch_after_topline` state vision
     alongside the existing straw-golem/soldier-ant/raven follow-ups:
     armed from both deferred-bite branches in js/allmain.js, consumed
     inside the topline-more dismissal worker in js/cmd.js.

2. Stoning-timeout death + wizard refusal chain:
   - timeout.c:137-190 stoned_dialogue() stage messages/side-effects
     (already ported); new: stage-3 paralysis interaction with death.
   - timeout.c:684-685 done_timeout(STONING, STONED) — the *expired*
     intrinsic is cleared status-side before/after die(), and no
     "You die..." line is emitted (that string is losehp()-only,
     hack.c:4287).  armHeroDeathMore('') now supports this.
   - end.c:1085-1135 die(): "Die?" paranoid query (spell "yn"), the
     refusal "OK, so you don't die.", then savelife() (end.c:704-758)
     pushing gn.nomovemsg = "You survived that attempt on your life.",
     svc.context.move = 0 and gm.multi = -1 (end.c:726-736).
   - Because die() is called from inside nh_timeout(), after the refusal
     the SAME once-per-turn tail resumes: dosounds (allmain.c:344),
     do_storms, gethungry (allmain.c:355), exerchk (allmain.c:356),
     u_wipe_engr (allmain.c:360-361) — mapped to a new resume-mode of
     finishMonsterTurnTail (`resumeAfterStoningDeath`) that skips the
     pre-nh_timeout prefix sections and the immobile-hero processMonster
     cascade, then ends the pass (the full next turn waits for the next
     key, exactly like allmain.c's next iteration).
   - done_timeout does not touch u.uhp (the stat line stays at the
     pre-death HP through the statue--More-- chain and only flips to 0
     when the Die? prompt triggers the bot redraw): the stoning-expiry
     arm no longer zeroes the hp in the JS port either.
   - exerchk/exerper parity gating (attrib.c:520-545 periodic exercise,
     attrib.c:489-512 rn2(19)/rn2(2)): hinged on svm.moves; the aborted
     death tail dropped the death turn's move increment (allmain.c:243-244)
     leaving `game.moves` one behind C's svm.moves for every subsequent
     %10 check — restored at the arm point.

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js')": OK
- Target session via ps_test_runner: RNG 3076/3076 (bit-exact prefix,
  was 2892/3076), screens 130/151 (was 111/151), cursors 138/151
  (was 125/151).
- frozen/score.sh public corpus: 49/49 green (unchanged).
- sessions-extra sweep vs a git-archive base (009c38d) side-by-side: all
  prior PASS extras byte-identical metrics; no passing extra regressed
  (numbers compared for minetown/sacrifice/polyself/castle/archlich/
  muse/harass/steed/gascloud/sokoban etc. — all unchanged).

## Remaining unported

Per-input-boundary packaging of hero-free turns in the mixed
occupation+paralysis+stoning region (steps 107, 135-142, 144-150):
- mhitu.c:1265 hitmu→stop_occupation vs allmain.c:505-507 monster_nearby
  stop ordering within the same moveloop pass (step 107 message order).
- The tty topline state machine (win/tty/topl.c update_topl()/more()/
  NEED_MORE) versus the JS pending-time pipeline: which silent keys the
  engine eats between a stage message and the next monster phase, and
  thus when each turn's tail rolls/message consumer moves boundary.
  All RNG bits land in flat order; only the boundary placement (and
  derived status "T:"/HP/cursor display timing) diverges.

Safe continuation plan for the next wave: rerun the extra sweep after any
pass-scheduler change; the remaining structured work is the counted-search
occupation + more-deferral interlock in js/allmain.js:17786-17820
(monster_nearby deferred stop) and js/cmd.js dismissal chain; changes
there ripple through every timed/intrinsic session in the public corpus.
