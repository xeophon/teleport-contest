# seed9161-wiz-steed — findings

## What the session covers

Riding/steed subsystem end-to-end:

1. `#wizgenesis tame pony` (adjacent spawn, tame disposition prefix in
   create_particular_parse); `#wizwish saddle` (lands on o).
2. Apply saddle ×3: two rn2(100)-based resists ("The pony resists!",
   steed.c use_saddle chance: Dex + Cha/2 + 2*tame + 20*ulevel - 20 unskilled),
   success on attempt 3 as the pet wanders between adjacent tiles.
3. `#ride j` → wizard-only "Force the mount to succeed? [yn]" → y;
   6 ridden moves (post-moves riding locomotion).
4. Kick steed (^D → "Kick your steed? [yn] (y)" y): tameness-- + buck check
   `u.ulevel+mtame < rnd(MAXULEV/2+5)` → THROWN ("You are thrown off..."),
   landing damage kills the level-1 wizard → "You die..." → Die? n →
   wizard-revival ("You survived that attempt on your life.").
5. Remount w/ wounded legs: force-mount leg branch: "Your legs are in no
   shape for riding." + "Heal your leg? [yn]" y → heal_legs + mount.
6. Second kick → "The saddled pony gallops!" (u.ugallop += rn1(20,30)).
7. `#ride` while mounted → voluntary dismount ("on a pony with no name.").

Recorded with seed 9161. 105 steps, ends T:18; recorder exits cleanly.

## Final JS score

→ **FAIL — RNG 5749/5927, Screen 43/105 (cursors 62/105)**.
Matches all of genesis/wish/eat-free inventory handling and the pet's
per-turn wander rolls up to rn2(100)=41 (step 39 region).

## Divergence (RNG index 5717, input step 44) — first saddle application

The 'a'o'u' saddle attempt: C rolls `rn2(100)=92` (the use_saddle resist
check at steed.c) → "The pony resists!"; JS instead calls rn2(12) —
a monster-move roll — i.e. JS produced no resist roll at all.
Gap guess: JS steed/use_saddle apply-to-pet path is missing the
rn2(100) < chance saddle attempt roll (and likely prints neither the resist
nor the success branch identically) — saddling is at best partially ported.
