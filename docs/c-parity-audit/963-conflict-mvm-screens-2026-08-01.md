# C-parity audit — conflict mvm screens (seed9104), 2026-08-01

Scope: `sessions-extra/seed9104-wiz-conflict-mvm.session.json`.  Wave took
over at RNG 2936/2936 (full), screens 92/181 — screen-side only.  Target now
**PASSES**: RNG 2936/2936, Screens 181/181 (cursors 181/181).  Publics stay
44/44; passing extras stay green (11 base-passing extras all still pass).

## Method note (new tooling this wave)

The MBA difference between C screen boundaries and JS boundary placement was
debugged by *rebuilding the patched C recorder* (copy of
nethack-c/recorder to /tmp) with NHDBG instrumentation at:
moveloop_core entry (allmain.c), header/movemon completion, stop_occupation,
dochugw/monster_nearby (with monster id + rng index), mattacku per-slot,
hitmsg, mdamageu (with hp_before), and a BOUNDARY line with the rng call
count at every tty_nhgetch-nomux capture point.  Driving it with the
session's exact moves made C's iteration/boundary structure fully observable
and aligned with the recorded rng/screen fields one-to-one.  (Changes live
outside the repo entirely — /tmp/nh-rec-dbg was never committed.)

## What was ported / fixed (C refs)

1. `js/cmd.js` wizgenesis "appears next to you" — `an()` article via
   Amonnam() (makemon.c:1482; do_name.c:1158-1165; objnam.c:2143-2155).

2. `js/allmain.js` search-occupation stop split into C's two flavors:
   - dochugw() mid-movemon stop (monmove.c:203-238) — crossing the
     (BOLT_LIM+1)^2 ring or newly visible mid-movemon; message deferred to
     after processMonsterTurns() to follow that turn's monster messages
     (C runs movemon at the top of the moveloop iteration: allmain.c:203-216).
   - handle_occupation monster_nearby() stop (allmain.c:495-510,
     hack.c:4106-4127), evaluated post-movemon; triggers ONE extra key-free
     movemon pass (svc.context.move is set every iteration: allmain.c:483,
     the handle_occupation return path at 509-510).

3. hitmu() trailing stop_occupation (mhitu.c:1265; missmu mhitu.c:99) —
   occupation-text correct ("searching"/"waiting", allmain.c:684-696),
   universal across the initial multiattack path AND the armed-monster path;
   on a FATAL hit the text is deferred until after "OK, so you don't die."
   (done() returns into hitmu before stop_occupation runs — verified with
   recorder traces).

4. Per-slot sequencing in monster-vs-hero multiattacks following hitmu()
   (mhitu.c:1187-1265): damage roll → hitmsg (inline --More-- block point)
   → knockback rn2(3)/rn2(6) → mdamageu → death → done() → post-revival
   resumption with the NEXT monster in movemon order.  On topline
   overflow, kb/damage/death defer to the dismissal via the existing
   `_deferred_multiattack_after_more` channel.  When the replay consumed a
   monster's remaining slots, the resume flags clear so movemon advances.

5. hitmsg " again" semantics across --More-- splits (mhitu.c:72-77,
   missmu reset mhitu.c:87-88): prevAttack threading + consecutive-slot
   same-base-verb ("aatyp proxy") rule in the replay.

6. Death-mid-movemon boundary ownership: a queued `"You die..."` now wins
   a pending --More-- dismissal ahead of waiting monster/topline resumes
   (end.c:1107-1118 — done()'s wizard "Die?" dialogue runs synchronously
   mid-movemon); the pass loop parks while such a death is queued behind
   --More--; after revival the interrupted movemon continuation runs
   (killed-monster slot leftovers are no-ops in both C and JS).

7. Status-line HP quirk: when the killing blow lands at exactly -1, the
   status bar keeps the pre-damage value through the "You die..."/Die?
   dialogue (deathMoreHp mechanism, game_display.js:150-154, extended to
   the deferred-multiattack resume hp applications).

## Wired where

- `js/allmain.js`: moveloop_core pass structure (deferred stop emission
  point right after processMonsterTurns, `_stop_search_extra_pass`
  recharge at the pass decrement, queued-death park in the while guard and
  in the _process_time_with_more clause), processMonsterTurns multiattack
  hit/miss branches + armed-monster branch ordering and stop plumbing,
  dochugw-clone condition tightened (adjacency clause removed — plain
  adjacency is monster_nearby's domain).
- `js/cmd.js`: deathDieMore hoist into the dismissal cascade,
  deferred-multiattack replay (again-rule, resume-advance, pre-damage HP
  bookkeeping), revival survivalMessages append, wizgenesis article.
- js/isaac64.js, js/terminal.js, js/storage.js untouched; js/display.js and
  game_display.js untouched (existing deathMoreHp display rule reused).

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js')"` → loads OK
- `node --test test/*.test.mjs` → 3643/3643 pass
- `bash frozen/score.sh` → 44/44 passing (public sessions)
- `node frozen/ps_test_runner.mjs sessions-extra` → 12/23 passing;
  target seed9104 → **PASS (RNG 2936/2936, Screen 181/181)**.

## Known residual issues (other extras; not this session's target)

- seed9102-wiz-werewolf-night: RNG full at base; since these edits it is
  RNG 3636/4009 (screens 84/144, up from 37/144 at base).  The residual
  mismatch is in the werewolf-night regen_hp/lycanthropy area
  (rn2(100) vs rn2(60) shape at step ~95 of that session) — NOT related to
  the mvm/stop machinery proven here; the survival stop-search text itself
  matches the recording ("OK, so you don't die.  You stop searching.--More--"
  appears there too).  Left for the followup wave.
- seed9103-wiz-werewolf-day: RNG now FULL (was 2638/2787), screens 120/144
  (base 35/144) — improved but not passing.
- minor drifts: seed9150 RNG 5668→5665/7685 (harassment flow).
- Unported here: nothing further inside this session; the subsystem
  differences that remain live in werewolf/shapeshifter movement,
  castle/instrument tunes, polyself, sacrifice — per their own findings.
