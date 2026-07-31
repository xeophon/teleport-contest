# seed9150-wizard-harass-intervene — findings

## What the session covers

Wizard of Yendor death/resurrection bookkeeping + demigod harassment (`wizard.c`):

1. `#wizgenesis Wizard of Yendor` — unique force prompt ("Creating doppelganger
instead; force Wizard of Yendor? [yn] (n)" answered `y`), adjacent spawn.
2. `#wizkill` getpos monster-cycle kill ("You kill the Wizard of Yendor!") →
`wizdeadorgone()` sets `u.uevent.udemigod`, `u.udg_cnt = rn1(250,50)` (=this run: 50;
seed chosen for small value).
3. `#wizwish the Amulet of Yendor` + the 5.0 first-pickup bonus wish
("The Amulet is bestowing a wish upon you!" → potion of gain level).
4. `^V oracle` levelport renaming to Delphi (lev_by_name special level).
5. `do` — drop the Amulet (removes aggravate-monster so searches proceed).
6. 34 counted searches: at T~52 `intervene()` fires, case 4 = `nasty()`:
"A leocrotta suddenly appears next to you!" (rn2(6)=4 @ wizard.c:787,
rn2(10) @ nasty, rn2(44) pick_nasty, rnd(4) count). Leocrotta mauls hero repeatedly;
Die?-no revival cycles run to session end.

Recorded with seed 9150. 223 steps, ends T:54, recorder exits cleanly.

## Final JS score

→ **FAIL — RNG 2330/7685, Screen 29/223 (cursors 106/223)**.

## Divergence (RNG index 2278, step 30) — forced unique generation

Matched all 2278 calls through the `#wizwish`/`#wizgenesis` prompts. First mismatch at
step 30 (the 'y' at the force-unique prompt); C `d(30,8)=150` (newhp for a level-30
unique: the Wizard's 30d8 base HP) vs JS `rnd(4)=3`, then desync.
Gap guess: JS's wizard-genesis force-unique path creates the monster with a different
HP roll (`rnd(4)` — looks like a different formula/level used) — unique-monster
newhp/makemon branch mismatch in JS wizgenesis.
