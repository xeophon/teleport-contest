# seed9103-wiz-werewolf-day — findings

## What the session covers

Same werewolf scenario as seed9102 but at MIDDAY (datetime
20260720120000) — A/B against the night run for `night()`-dependent
uwerechange/monster werechange rates:

1. `#wizgenesis werewolf` adjacent spawn.
2. ~40 counted searches: werechange toggles human<->wolf, "You feel
   feverish." hero infection at step 28, were_summon ("The werewolf
   summons help!  A wolf suddenly appears next to you!"), wolf bites,
   Die?-no revival cycles.

Recorded with seed 9103. 144 steps, ends T:17, recorder exits cleanly.

## Final state

`node frozen/ps_test_runner.mjs sessions-extra/seed9103-wiz-werewolf-day.session.json`
→ **PASS — RNG 2787/2787, Screen 144/144 (cursors 144/144)**.

## Diagnosis summary

The RNG was completed by the cont9103 stop-search-defer work
(allmain.c:481-511 + charge per allmain.c:479).  The remaining screen
divergences this wave were, in order of first occurrence:

- changes-into-a-form map glyph shown one boundary early whenever the
  transform message overflowed into --More--; C's new_were()
  (were.c:113-128) re-displays only after the dismissal.  Fixed by
  deferring only the *map repaint* while keeping the immediate data
  swap (the werewolf's resumed attack uses post-swap wolf-form dice,
  matching recorded d(2,6)).
- stop-searching/survivor message cadence around the Die? refusal
  chain: stop_occupation ordering relative to later bites
  (mhitu.c:1265 vs allmain.c:684-697), then "You survived that attempt
  on your life." via end.c:727 nomovemsg → allmain.c:381-383 unmul.
- were_summon --More-- suspension + Norep identical-message suppression
  (shared with the night session fix in
  docs/c-parity-audit/970-werewolf-night-day-reconcile-2026-08-01.md).
