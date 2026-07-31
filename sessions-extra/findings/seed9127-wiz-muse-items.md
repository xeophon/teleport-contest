# seed9127-wiz-muse-items — findings

## What the session covers

Monster item use (muse) + monster equipment + salamander combat anatomy:

1. `#wizwish wand of lightning` (o - marble wand), walk south, `do` drop attempt.
2. `#wizgenesis salamander` — adjacent spawn; salamanders generate with personal gear:
   here a spear AND a usable wand.
3. 26 searches. Recorded: monster USES an offensive wand against the hero
   ("The salamander zaps a silver wand!  Boing!"), wields its spear ("The salamander
wields a spear!"), touch attacks with fire immunity check ("You avoid harm."),
grab/roast ("The salamander grabs you!" / "You're being roasted!"), release,
   Die?-no revival cycles.

Recorded with seed 9127. 143 steps, T:9; recorder exits cleanly.

## Final JS score

→ **FAIL — RNG 2706/2862, Screen 66/143 (cursors 70/143)**.
Matched everything through wish + walk/drop + genesis (incl. the salamander's
starting-gear rolls, 2699 calls).

## Divergence (RNG index 2699, step 66) — the wand zap turn

Exactly at the recorded "The salamander zaps a silver wand! Boing!" step:
C `rn2(100)=20` vs JS `rn2(5)=0`, then zap-damage bookkeeping desyncs.
Gap guess: JS monster wand-zap (use_offensive → wand damage/effect order) differs
from C — likely missing/skipping the `rn2(100)` roll at zap start (fear/awaken or
zap-type gate) — muse offensive-wand path partially ported.
