# seed9160-wiz-trap-disarm — findings

## What the session covers

Wizard-mode trap probing + the #untrap flow on dlvl1:

1. `#levelchange 15` (new HP base so arrow traps can't kill), `#wizmap`.
2. `^T` controlled teleport (tip-window dismiss) to beside a falling rock trap;
   `#untrap h` → "You cannot disable that trap." (non-disarmable trap branch).
3. Step onto an anti-magic field (known-trap [yn] prompt) → Pw drain: d(2,6)
   + rnd(half) + drain_en rolls.
4. `^T` beside an arrow trap; `#wizkill` cursor-cycle slay of a wandering newt.
5. Three deliberate step-ons of the arrow trap ([yn] y): incl. the
   dotrap escape path (rn2(5) @ trap.c:3038 → "You escape an arrow trap.")
   and a "Things that are here:" multi-object listing (--More--).
6. 16 `#untrap .` attempts standing on the trap: repeated untrap_prob
   (rn2(3)) failures → rnl(5) "Whoops..." → dotrap FAILEDUNTRAP re-trigger
   (escape roll, arrow to-hit/hit/miss, damage), one "difficult to disarm"
   (rnl(5)==0) variant, success at attempt 8 ("You disarm the trap." +
   50−rnl(50) arrow pile), then post-trap "You know of no traps there.".

Recorded with seed 9160. 287 steps, ends T:20, HP:82(87); recorder exits cleanly.

## Final JS score

→ **FAIL — RNG 2836/3350, Screen 111/287 (cursors 271/287)**.
Full match through levelchange, #wizmap, both teleports, the falling-rock
attempt, anti-magic drain, wizkill, and all three arrow-trap step-ons.

## Divergence (RNG index 2835, input step 135) — first `#untrap .` attempt

At the first disarm attempt C emits a roll burst JS never makes:
C rn2(5)=2, rn2(8)=1, rn2(20)=3, rn2(5)=4, rn2(12)×2 … vs JS going straight to
rn2(3)=0 (untrap_prob, an immediate SUCCESS) followed by rnl(50)=13
(cnv_trap_obj arrow-pile count) — i.e. JS disarms "cleanly" by skipping C's
failed-untrap machinery (rnl(5) Whoops gate + dotrap FAILEDUNTRAP: escape
rn2(5) @ trap.c:3038, arrow fire to-hit/miss/damage). C totals 3350 calls vs
JS 2860.
Gap guess: JS trap.c #untrap on floor shooting traps misorders/omits the
try_disarm failure branch (rnl(5) whoops + trap re-fire on the hero) — the
"Whoops... An arrow shoots out at you!" composite is unported — while the
happy-path untrap_prob/cnv_trap_obj rolls are present.
