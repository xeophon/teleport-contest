# seed9102-wiz-werewolf-night — findings

## What the session covers

Wizard-mode lycanthrope dynamics at NIGHT (datetime 20260720230000; `night()` = hour<6||hour>21):

1. `#wizgenesis werewolf` — force-free species gen; monster placed adjacent ("A werewolf appears next to you.").
2. ~40 counted searches while adjacent: monster werechange toggles ("The werewolf changes into a human." / "into a wolf."), `were_summon` help calls ("The werewolf summons help! A wolf suddenly appears..."), werewolf/wolf/warg bite combat, wizard-mode "Die? [yn]" cheat cycles.
3. Hero lycanthropy infection: "The werewolf bites!  You feel feverish." (AD_WERE infection branch, u.ulycn set).
Hero were-transformation itself not reached (needs ~50 uninterrupted turns; constant attacks break each search).

Recorded with seed 9102. 144 steps, ends at T:12 with hero mid-combat; recorder exits cleanly.

## Final JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9102-wiz-werewolf-night.session.json`
→ **FAIL — RNG 568/4009, Screen 21/144 (cursors 64/144)**.

## Divergence 1 (RNG index 434, step 0) — level generation

First mismatch is inside step 0 (level/population gen): C `rn2(5)=1` vs JS `d(5,5)=15`,
then a run of `rn2(5)`/other die rolls desync. Everything before matched (433 calls).
Gap guess (1-line): JS level-gen places an extra/different random-inventory stack
(C loops `rn2(5)` counts; JS rolls `d(5,5)`) — monster-starting-inventory roll shape
mismatch (likely extra-object generation branch), not night-specific.

Compare with the near-identical DAY recipe (seed9103) which matches through 2420 —
seed-dependent, so the desyncing object/monster exists only on this level layout.
