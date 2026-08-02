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

## Final JS state (wave 5 continuation)

→ **FAIL — RNG 2862/2862 (complete), Screens 139/143 (cursors 143/143).**

Base at takeover was RNG 2830/2862, Screens 72/143.

## Divergences fixed this wave

1. **mhitm_knockback rolls skipped on mspec-substituted claw hit** (RNG gap at
   step 121): getmattk() substitutes grab slots with 1d6 claw/touch attacks
   after release (mhitu.c:371-392); hitmu still runs them through
   mhitm_knockback which consumes rn2(3)+rn2(6) unconditionally at entry
   (uhitm.c:5258/5269) — the JS chain finished the slot after printing the
   hit message without the hitmu tail.  Fix realigns the whole RNG stream
   (C log ends at rng 2862 mid-slot-3 aftermath of the recorded hero death;
   JS emits the matching tail pair beyond it).

2. **Search-occupation interrupt timing** (screens from step 66 on):
   - occupation-branch monster_nearby stop ("You stop searching.") is a
     continuation-tick-only check (allmain.c:485-508); the press's first
     search is the bare rhack action.  JS ran it on the first tick, cutting
     the C two-turn batch that contains "--zaps a silver wand!  Boing!" and
     shifting every later frame.
   - the per-monster post-move stop at tick 1 additionally needs the monster
     to have engaged the hero (mhitu.c:1265/99 hitmu/missmu stop_occupation,
     dochugw novelty rule monmove.c:222-235); a wandering-only salamander
     must not interrupt tick 1.

3. **savelife nomovemsg paging ("You survived that attempt on your life.",
   end.c:727, unmul hack.c:4185)**: when a monster attack chain resumes
   across a "Die? n" refusal and produces more topline batches afterwards,
   the queued survived line must still be emitted so the tty-style
   width/More pagination matches; and when it pages behind a More the turn
   tail (moves++/new-turn block before tail block, allmain.c:222-244,
   269-390) continues to completion rather than deferring past the stall.
   This realigned the entire revival/death schedulings (steps 82-131).

## Remaining divergence (4 screens)

Steps 132-135 (*4th revival cycle*): C's tty keeps showing HP:12(12) on the
"The salamander hits!--More--" and "You die...--More--" frames and only
switches the status line to HP:0(12) at the "Die?" frame, while cycles 1-3
show HP:0 immediately.  This is bot()/status-line refresh sequencing vs
losehp inside mdamageu relative to a mid-hitmu --More-- block — cell text
and all rolls match; only the HP cells differ on those frames.  Likely fix
would be modelling done()'s status update timing; low score density, so
left for a later wave (documented for the next pass).
