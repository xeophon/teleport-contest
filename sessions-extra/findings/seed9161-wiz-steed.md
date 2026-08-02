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

→ **PASS — RNG 5927/5927, Screen 105/105 (cursors 105/105)**.

## Final diagnosis (wave-5 continuation)

The wave-5 suspicion was right: nothing in the apply-a-saddle path existed.
C's use_saddle (steed.c:36-141) runs `rn2(100) < chance` (Dex + Cha/2 +
2*mtame + 20*ulevel for tame, −20 unskilled) at the direction keypress; the JS
port instead consumed the turn at the *item-selection* key with a fallback
"Nothing happens.". Once the multi-key flow was wired ('o' selects the saddle
→ "In what direction?" → direction key runs the attempt and charges the
turn), all three attempts (92/58 resist, 31 succeed) matched and the rest of
the divergences were reach-through effects:

1. seed9161 divergence at rng[5717]/step 44: missing use_saddle roll entirely.
2. The knight-riding skeleton already present (basic mountSteed) lacked the
   doride wizard force prompt ("Force the mount to succeed? [yn]",
   steed.c:185-193), the forced mount skip-blocks (no --mtame / slip-roll),
   and the wounded-legs remount interlude ("Your legs are in no shape for
   riding." → "Heal your leg? [yn]" → heal_legs) — now ported.
3. `^D` while mounted had no steed branch: now asks "Kick your steed?
   [yn] (y)" (dokick.c:1270-1278) and runs kick_steed (steed.c:414-449) —
   buck check rnd(20), thrown-off dismount with landing_spot tie-break rolls,
   landing damage death → wizard "Die?" refusal resumes the dismount tail
   (wounded legs rn2(5), steed placement, hero landing spot) through the
   wizardDieConfirm refusal hook; or the gallop path (`rn1(20,30)` ugallop).
4. Pet AI parity details the saddle exposed: C's droppables() ignores worn
   monster gear, so a saddled pet runs neither the minvent-drop rolls
   (`rn2(udist+1)` / `rn2(edog->apport)`) nor the dog_goal minvent apport
   fallback; JS keyed off minvent length and double-billed the hero inventory
   scan because the invent alias went stale across the freeinv-into-mpickobj
   handoff.

See docs/c-parity-audit/981-steed-saddle-ride-kick-2026-08-02.md for the full
C-reference breakdown and remaining list.
