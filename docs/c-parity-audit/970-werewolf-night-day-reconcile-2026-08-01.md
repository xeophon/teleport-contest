# Audit — seed9102-wiz-werewolf-night + seed9103-wiz-werewolf-day (2026-08-01)

## Scope covered this wave

Wizard-mode lycanthrope combat loops at night (seed9102) and day
(seed9103): counted 5x-search turns against a #wizgenesis werewolf,
were-form toggling, were_summon helper bursts, AD_WERE hero infection,
and repeated wizard "Die? [yn]" cheat-death cycles with revived HP
trading blows with wolves/wargs inside the same monster passes.

Wave-5 continuation task: the cont9103 stop-search defer merge
(`_search_stop_check_after_monsters`, allmain.c:481-511 + extra
turn charge per allmain.c:479) had regressed seed9102's previously
full RNG (3636/4009, 76/144 screens) while completing seed9103's RNG
(2787/2787).

## Divergence diagnoses and fixes

### 1. Deferral tail killed the hero *before* the queued "You die..." surfaced (night RNG 3636→4009)

RNG root: C's stream for seed9102 includes `rn2(100) @
regen_hp(allmain.c:659)` at the revived hero's post-bite turn tail; JS
skipped it because the hero sat at 12/12 (full) HP at regen time.  C's
hp gate is `u.uhp < u.uhpmax && ...` (allmain.c:655-659).

Cause: when the wolf's *second* bite in the resumed monster pass was
fatal, JS applied that attack's deferred damage in the `--More--`
dismissal tail (`_damage_after_topline_more` in js/cmd.js), queued
"You die...", and then — because the resume machinery
(`_monster_resume_index`) was still armed — ran the *next* monster
(the werewolf) against the 0-hp hero before the death prompt chain
surfaced.  HP was then restored to full by the revival (end.c
savelife() port) *after* the werewolf's bite → regen skipped.  In C,
die() runs synchronously inside the fatal hit (mhitu.c:1258 mdamageu →
done_in_by → done, end.c:1025+); the prompt chain resolves, savelife()
(end.c:704-758) restores HP, and only then does the monster loop
continue.

Fix (js/cmd.js): when the deferred-damage tail brings the hero to ≤0
and queues "You die...", set `_death_queued_mid_attack_tail`; the
forced continuation gating then keeps `_message_more`/time-processing
from resuming the armed monster phase (`_process_time_with_more`,
`_process_command_time_now`) until the Die?/savelife chain has
resolved.

### 2. new_were map glyph swapped before the --More-- boundary (day step-40/129 `[d` vs `[@`)

C's `new_were()` prints the feedback message *first*, then
set_mon_data()/newsym() (were.c:113-128).  When the feedback message
overflows the topline, tty putmsg blocks inside new_were() on
`--More--`, so the boundary snapshot still shows the old form glyph.

Fix (js/were.js + js/allmain.js + js/input.js): newWere() splits — the
data swap/healmon/gear shedding apply immediately (combat/RNG state is
post-swap exactly as C's post-dismissal continuation sees it; the
werewolf's own resumed attack rolls with wolf-form `d(2,6)`, matching
the recorded die sizes at seed9103 step 137), while the map repaint is
deferred: `g._deferred_were_transforms` flushes from nhgetch when the
input key actually dismisses a pending --More-- (space/CR/LF/ESC; C's
tty --More-- silently swallows other keys — digit/count prefixes leave
the recorded screen unchanged, hence the dismissal-class gate).
ctx.addToplineMessage wrappers now return the overflow signal so
newWere() can see it.

### 3. were_summon helper loop must suspend on topline overflow (both sessions' summon screens)

C's summon sequence is interrupted per putmsg --More-- boundary:
"X summons help!" (mhitu.c:994-995), then per-helper makemon
(were.c:142-189 loop: species chain were.c:156-171, rnd(5) at
were.c:149), each helper's makemon prints its own appear message
(makemon.c:1491+) and runs dochugw(mtmp, FALSE) (makemon.c:1503-1504 →
monmove.c:204-238), whose stop_occupation (allmain.c:684-697) prints
"You stop searching." *between* two helpers' appear messages (recorded
seed9102 steps 58/59).  C also drops a helper whose appear message is
identical to the previous one (Norep, pline.c:327-336 — makemon.c:1491
uses Norep for these appearances), which is why the third "A wolf
suddenly appears next to you!" is absent from the recording.

Fix (js/allmain.js werewolf block): summon flow converted to an
explicit resumable engine (`game._wereSummonResume`) using the same
pause/resume flag set as the shared attack-more machinery
(`_monster_resume_same_index` + `_monster_resume_after_preturn` +
`_attack_resume_after_more` + `_resume_time_after_more`):
 - suspend on every putmsg overflow (summons-help / appears /
   stop-searching / tail "But none comes." / "You feel hemmed in."),
 - resume at exactly the following loop state after dismissal,
 - dochugw occupation-stop emulation per helper (hostile, mobile,
   visible, within (BOLT_LIM+1)^2),
 - `_monster_resume_index` re-anchored with reversed-PMT index math
   (PMT iterates the level-monster list reversed; makemon insertion
   shifts the werewolf's position mid-turn),
 - `_norep_prevmsg` tracked in addToplineMessage to mirror pline's
   gp.prevmsg and suppress the identical consecutive appear message.

### 4. "You survived that attempt on your life." cadence (final screens of both sessions)

After a "Die?" refusal, C arms `gn.nomovemsg = "You survived that
attempt on your life."` (end.c:727) and prints it via
unmul(NULL) once `++gm.multi == 0` at an immobile moveloop pass tail
(allmain.c:381-383); tty putmsg joins it onto the pending line when it
fits, else splits with --More--.  The old JS gate only merged it when
the pending line *exactly* equaled "OK, so you don't die." and
silently discarded it otherwise (lost survivor lines / wrong boundary).

Fix (js/cmd.js + js/allmain.js): wizard-refusal arming records
`_survivor_emit_after_moves = moves + 1`; the rhack tail never drops
the queued line, and when one immobile pass has completed (and the
refusal rode a counted-search stop — `_survivor_via_search_stop`, set
where mhitu.c:1265's stop_occupation marker turns into the "You stop
searching." survival-line fragment), it merges with the current pending
message when it fits, otherwise forces a --More--.  The extra gate
keeps seed0399-wizard-hallu-actions (free-move refusal where C never
prints the survivor line in the recorded window) byte-exact.

## What remains unported in this subsystem

- The hero's own lycanthropy transformation (`you_were` flare path) is
  reached only once in these recordings; the polyself-form variants
  (attack-die swaps while were-formed, rehumanize) are stub-equivalent
  approximations elsewhere in this port and not exercised here.
- `were_summon` suspension is implemented only in the werewolf mhitu
  block (allmain.js); the hero-side you_were summon path (were.js
  wereSummon) still runs atomically.
- dochugw's full condition set (Hallucination clause, monster
  perception subtleties, scary-square flee inside makemon) is reduced
  to the recorded-session-visible subset.
- The survivor-message merge rule keys off the revived-inside-
  counted-search context; other refusal contexts (amulet lifesave,
  run-mode interruption, frightened directions) still flow through the
  pre-existing exact-match gates.
- sanctum/wolf-side interactions (wake_nearto howl distances,
  Protection-from-shapechangers equipment) remain covered only as far
  as the two recordings exercise them.

## Verification

- seed9102-wiz-werewolf-night: RNG 4009/4009, screens 144/144 — PASS.
- seed9103-wiz-werewolf-day: RNG 2787/2787, screens 144/144 — PASS.
- 44/44 public sessions pass (`bash frozen/score.sh`).
- All previously-passing sessions-extra sessions still pass; no extra
  session's RNG/screen metrics regressed vs the pre-wave baseline
  (seed9104's RNG incidentally improved 2851→2936 earlier this wave;
  seed9127-muse shows its pre-existing partial numbers again).
