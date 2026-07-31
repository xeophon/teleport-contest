# seed9103-wiz-werewolf-day — findings

## What the session covers

Same werewolf scenario as seed9102 but at MIDDAY (datetime 20260720120000) — A/B against
the night run for `night()`-dependent `uwerechange`/monster werechange rates:

1. `#wizgenesis werewolf` adjacent spawn.
2. ~40 counted searches: werechange toggles human<->wolf, "You feel feverish." hero
infection at step 28, `were_summon` ("The werewolf summons help! A wolf suddenly appears
next to you!"), wolf bites, Die?-no revival cycles.

Recorded with seed 9103. 144 steps, ends T:17, recorder exits cleanly.

## Final JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9103-wiz-werewolf-day.session.json`
→ **FAIL — RNG 2429/2787, Screen 21/144 (cursors 61/144)**.

## Divergence (RNG index 2420, step 21) — first post-genesis monster turn

All 2420 RNG calls through `#wizgenesis` match exactly (level gen + werewolf creation,
incl. day/night deltas vs 9102 handled fine). First mismatch on the first 's' turn:
C `rn2(50)=2` vs JS `rn2(75)=2`.
Gap guess: monster-move werechange/AI odds-roll bound mismatch on the werewolf's first
post-genesis move (`werechange`/follow-target branch: C rolls rn2(50), JS rn2(75)) —
JS uses a different probability constant for this monster branch.
