# seed9102-wiz-werewolf-night — findings

## What the session covers

Wizard-mode lycanthrope dynamics at NIGHT (datetime 20260720230000;
`night()` = hour<6||hour>21):

1. `#wizgenesis werewolf` — force-free species gen; monster placed adjacent.
2. ~40 counted searches while adjacent: werechange toggles
   ("The werewolf changes into a human."/"into a wolf."), were_summon
   bursts ("The werewolf summons help!  A wolf suddenly appears..."),
   werewolf/wolf/warg bite combat, wizard-mode "Die? [yn]" cheat cycles.
3. Hero lycanthropy infection: "The werewolf bites!  You feel feverish."
   (AD_WERE infection branch, u.ulycn set).

Recorded with seed 9102. 144 steps, ends at T:12 with the hero mid-combat;
recorder exits cleanly.

## Final state

`node frozen/ps_test_runner.mjs sessions-extra/seed9102-wiz-werewolf-night.session.json`
→ **PASS — RNG 4009/4009, Screen 144/144 (cursors 144/144)**.

## Diagnosis summary (wave-5 continuation)

The cont9103 deferred stop-search merge left the night session full-RNG
previous state broken at step 95: C records
`rn2(100) @ regen_hp(allmain.c:659)` and JS skipped it because the JS
hero was at 12/12 HP there (C's was 6/12).  The wolf's fatal *second*
bite, applied in the deferred-damage dismissal tail
(`_damage_after_topline_more`), queued "You die..." but the armed
monster-phase resume ran the werewolf against the 0-hp hero before the
death chain surfaced, and only then did the wizard refusal restore HP —
late, so regen_hp's `u.uhp < u.uhpmax` gate (allmain.c:655-659) was
false.  Fix: `_death_queued_mid_attack_tail` gate in js/cmd.js keeps the
monster resume suspended until the Die?/savelife() chain (end.c:704-758)
restores HP — C's synchronous mdamageu→done() interleaving
(mhitu.c:1258 → end.c:1025+).

Remaining screens fixed by (details in
docs/c-parity-audit/970-werewolf-night-day-reconcile-2026-08-01.md):

- were_summon suspension per putmsg --More-- (summon loop between helper
  makemons), including makemon.c:1503-1504 dochugw stop_occupation
  ("You stop searching." between helper creates) and makemon.c:1491
  Norep suppression of identical consecutive appear messages
  (pline.c:327-336).
- new_were glyph deferral on feedback-message overflow (were.c:113-128).
- end.c:727/allmain.c:381-383 survivor nomovemsg cadence through
  unmul()/"++gm.multi == 0".
