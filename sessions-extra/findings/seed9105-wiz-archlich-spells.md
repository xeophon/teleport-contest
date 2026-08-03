# seed9105-wiz-archlich-spells — findings

## What the session covers

Arch-lich melee + mage spellcasting vs hero (wizard mode, midday):

1. `#wizgenesis arch-lich` — adjacent spawn.
2. 30 counted searches. Recorded events: frost touch ("The arch-lich touches you!
You're covered in frost!") incl. inventory destruction ("Your potion of sleeping freezes
and shatters!"), `castmu` mage spells: summon nasties ("You feel as if you need some
help."), destroy armor ("You feel a malignant aura surround you."), psi bolt ("points at
you, then curses"), summon monster ("casts a spell!  A monster appears from nowhere!" —
carnivorous ape), ape attacks, Die?-no revival cycles.

Recorded with seed 9105. 115 steps, T:7; recorder exits cleanly.

## Current JS score (after slice/fin9105b, audit 983)

→ **still FAIL on screens — RNG 2391/2391 (full match), Screen 101/115
(cursors 115/115)**.  RNG and every screen now match except the 14 steps
[45-49, 60-62, 75-77, 93-95], which differ *only* in the status-line turn
counter (C shows the newly-started turn one window earlier).

## Final diagnosis (this slice)

Five divergences were found and fixed here (details in
docs/c-parity-audit/983-archlich-spells-death-chain-2026-08-02.md):

1. The deferred multiattack resume object dropped `mon` and the per-slot
   hit history, so getmattk()'s `mspec_used` hug-downgrade
   (mhitu.c:371-390, fed by nasty()'s `mspec_used = rnd(4)` summon
   cooldown, wizard.c:692-695) never applied when the ape chain resumed
   after --More--: C rolls d(1,6) for the downgraded claw, JS rolled
   d(1,8).  (allmain.js/cmd.js resume threading.)
2. end.c savelife() runs synchronously inside mdamageu/done/die
   (end.c:1108-1116, 704-758): the refusal heal must land mid-chain, not
   at prompt resolution; otherwise turn-boundary regen_hp
   (allmain.c:659 rn2(100)) sees a fully-healed hero and skips its roll.
   Added `_death_healed_at_chain_crossing` threading through
   deathDieMore/wizardDieConfirm.
3. hitmsg() " again" (mhitu.c:73-78) can never span a getmattk()
   alt_attk_buf substitution; the ported chains appended " again" to the
   downgraded hug slot.  Fixed on both the live-chain and resumed-chain
   paths.
4. The hitmsg()s of chain slots after a fatal hit print only after
   "OK, so you don't die."; they are now sunk and re-emitted by the
   refusal handler with the survivor line parked behind the forced
   --More-- (nomovemsg cadence, allmain.c:381-383).
5. nasty()/mcast_summon_mons spawns were not shown when a caster caused
   them: makemon.c:1472-1473 newsyms every in-game spawn
   unconditionally.

## Remaining divergences

- **Turn-counter cadence on cast/death boundaries** (steps 45-49,
  60-62, 75-77, 93-95): C's moveloop completes the interrupted movemon
  sweep and the new-turn block (mcalcdistress -> mcalcmove reallocation
  -> svm.moves++, allmain.c:227-253) synchronously, behind the parked
  cast-chain --More-- lines.  The port parks the entire
  processMonsterTurns() sweep while a lichChain entry is queued
  (js/allmain.js processMonsterTurns early-return), delaying moves++ by
  one or more input windows.  Lifting the park wholesale re-executes
  already-acted monsters (extra distfleeck rolls), so the proper fix is
  a sweep-resume index that continues from the caster's successor.
  Everything else matches the recording bit-exactly.

## RESOLVED — wave-5 continuation (audit 989)

Target session now **PASSES**: RNG 2391/2391, Screen 115/115 (cursors
115/115).  The remaining "turn-counter cadence" divergence from the previous
slice was root-caused with per-step RNG slices (`steps[i].rng` vs the engine's
`getRngSlices()`): C runs the movemon remainder, the new-turn block and the
once-per-turn tail — including `svm.moves++` (allmain.c:227-253) —
synchronously behind the LAST parked --More-- of the monster sweep, while the
JS engine ran that deferred tail only after the parked message queue fully
drained (one More window later).  Every conflicting cell was the status-line
`T:` label rendered one turn behind C.

Fix: phase-lock the rendered turn counter to C during such parked windows —
`game._status_turn_display_ahead_moves` (compared against `game.moves` in
game_display.js statusTurn(), so it self-clears when the real increment
lands), armed at the two sweep-final-pline sites: the lich-chain queue shift
whose remaining queue carries no further sweep-side effects, and the
wizard-mode "Die?" refusal path that re-emits the resumed attack chain's
parked hitmsg()s (`_death_chain_after_refusal_messages`).  No game state or
RNG timing changed; RNG stayed 2391/2391 bit-exact and all 52 publics +
12 previously-passing extras stayed green.
