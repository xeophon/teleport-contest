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

## Final JS score

→ **FAIL — RNG 2189/2391, Screen 25/115 (cursors 30/115)**. All matched through genesis.

## Divergence (RNG index 2186, step 26) — first arch-lich melee attack

C `d(5,6)=21` (the arch-lich's frost touch damage) vs JS `d(1,4)=2`.
Gap guess: JS resolves the arch-lich's touch attack with wrong damage (d(1,4) — as if a
different attack/entry were selected) — monster attack-table lookup or AD_COLD damage
branch mismatch in JS's mattacku for this caster.
