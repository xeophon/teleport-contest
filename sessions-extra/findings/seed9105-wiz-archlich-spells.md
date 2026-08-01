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

## Current JS score (after salvage of slice/fix9105, commit range …56e1756..HEAD)

→ **FAIL — RNG 2352/2391, Screen 74/115 (cursors 93/115)**. RNG and every screen match
up through the second ape attack round (~step 59; RNG prefix through 2351).

## Final diagnosis

The session layers four C behaviors that this port previously approximated:

1. **Frost touch chain (mhitu.c hitmu → uhitm.c mhitm_ad_cold)** — order is
   damage d(5,6), magic-negation rn2(10) (uhitm.c mhitm_mgc_atk_negated), frost pline,
   `m_lev > rn2(20)` gate, full destroy_items program (zap.c:5965-6110: limit calc
   rn2(5), per-stack rnd(4) + rn2(3) x quan with shatter plines pausing per stack),
   losehp+exercise rn2(2) (attrib.c:508) at each shatter display, then knockback
   rn2(3)+rn2(6) (uhitm.c:5258/5269) and mdamageu.  Implement as
   `coldTouchDestroyItemsProgram()` + `lichColdShatter` queue entries.
2. **castmu() (mcastu.c:129-330) runs after hitmu even when done() was refused**
   (wizard "Die?" → 'n'): choose_monster_spell / cursetxt / mspec_used / fumble rolls,
   message boundaries per tty pline; the spell's damage die (mcastu.c:240-243) and
   effect-side resolve on the window where the cast line displays.
3. **nasty() summons (wizard.c:590-712)** exercised via SUMMON_MONS: carnivorous ape.
4. **Coarse mechanics that bit us in passing**: monster_nearby stop_occupation
   vs hitmu's own stop ordering (the "You stop searching." banner belongs to whichever
   runs per C's pass structure), movemon attachment of the freshly-summoned monster,
   dochug distfleeck/goblin quiescence, mcalcmove fractional allocation ordering.

## Remaining divergences

- **Steps 84-114 (ape multi-attack after the second hero-death)**: C lets a monster's
  mid-pass attack chain continue THROUGH a refused done() (the ape's third slot lands
  in the same input window as "OK, so you don't die.").  The port's deferred-multiattack
  machinery currently halts the remaining slots at the death window; reconstructing the
  continuation inside wizardDieConfirm was out of budget.
- Turn-column cadence lag one window on cast boundaries (#60/#75 area screens match text
  but the hooks/turn advance land one input window later than C).
- RNG positional prefix ends at 2352 because of those last two windows.
