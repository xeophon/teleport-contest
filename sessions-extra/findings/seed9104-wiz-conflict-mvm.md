# seed9104-wiz-conflict-mvm — findings (FINAL)

## What the session covers

Ring of conflict + monster-vs-monster combat (wizard mode, midday, Dlvl:1):
wish ring of conflict, wear on left hand, #wizgenesis orc ×2 + orc-captain,
then 30 counted searches: conflict-driven mvm kills
("The orc-captain hits the orc.  The orc is killed!"), monster weapon
equipping ("The orc wields a curved sword!"), hero-targeted counts with
"hits again!", and wizard Die?-no revival cycles.

## Final JS score

→ **PASS — RNG 2936/2936 (FULL), Screens 181/181 (cursors 181/181).**

Base state this wave was RNG full, screens 92/181 (cursors 97/181) —
screen-side only.  Divergence classes fixed (in order of first appearance):

1. **Wizgenesis article** (steps 47/64/89): `"A orc"` vs `"An orc"`.
   makemon()'s MM_NOEXCLAM message names via `Amonnam()` = capitalized
   `an()` (makemon.c:1482, do_name.c:1158-1165, objnam.c:2143-2155).  JS
   hardcoded "A"; now applies `an()` for non-proper names.

2. **"You stop searching." ordering** (step 95): C runs movemon FIRST in a
   moveloop iteration (allmain.c:203-216), the search tick + stop_occupation
   AFTER (allmain.c:495-510).  JS emitted the stop message before the kill
   messages.  Emission is now deferred until processMonsterTurns() inside
   the pass completes.

3. **Two distinct occupation-stop flavors** (core discriminator for the
   whole cycle sequence):
   - *dochugw() mid-movemon stop* (monmove.c:203-238): a hostile monster
     that crossed the (BOLT_LIM+1)^2 ring / newly visible — the E1 kobold
     zombie crossing (49,3)->(50,3); NO extra iteration follows
     (the iteration ends at the occupation==0 branch → rhack).
   - *handle_occupation monster_nearby stop* (allmain.c:505-507,
     hack.c:4106-4127): an adjacent hostile after the tick — runs ANOTHER
     moveloop header before rhack because svc.context.move is set at
     allmain.c:483 every iteration.  JS: post-movemon evaluation + one
     extra key-free pass (`_stop_search_extra_pass`).
   Verified with the instrumented recorder build (NHDBG traces of
   dochugw/monster_nearby/STOP-OCC vs rng positions).

4. **hitmu()'s trailing stop** (mhitu.c:1265): every monster-vs-hero hit
   (and miss, mhitu.c:99) ends with stop_occupation().  Text is the armed
   occupation's own verb ("searching" vs "waiting", allmain.c:684-696).
   - The JS initial multiattack path double-gated it on
     _counted_repeat_interruptible; now fires whenever a search occupation
     is armed, with the right text.
   - The armed-monster path (weapon-wielding attacker) had no equivalent;
     added.

5. **Per-slot ordering inside monster-vs-hero multiattacks**
   (mhitu.c:1187-1265): damage roll → hitmsg() (a --More-- blocks INLINE)
   → mhitm_knockback rn2(3)/rn2(6) → mdamageu() (death → done() blocks
   inside) → stop_occupation().  Previously JS ran kb rolls inline even
   when the hitmsg overflowed; on overflow the kb/damage/death resolution
   now defers to the dismissal resume.

6. **hitmsg " again" continuation across --More-- splits** (mhitu.c:72-77):
   same monster hitting with the next attack slot of the same type.
   Threaded prevAttack/prevBaseVerb through the deferred-multiattack replay
   (data packs also bake "hits again" into slot-2 verbs; the rule resolves
   both).

7. **Done()-mid-movemon sequencing** (end.c:1107-1118): when the hero dies
   mid-monster-turn, done()'s "You die..."/"Die?" dialogue runs
   synchronously; the monster loop's continuation (remaining monsters,
   stall/recharge, overhead) resumes only after revival.  A queued death
   now wins the --More-- dismissal ahead of waiting topline/monster
   resumes, the pass loop parks while a queued death waits behind --More--,
   and after a fatal hit the monster loop restarts with the NEXT monster
   (resume same-index cleared), matching movemon order.

8. **Status HP display quirk during death --More-- chains**: when the
   killing blow lands at exactly -1, C's status line keeps showing the
   hit's PRE-DAMAGE hp through the whole "You die..."/Die? dialogue
   (mdamageu at mhitu.c:1904-1928 — the bar repaints later).  Extended
   the existing `_death_status_hp_before_zero` mechanism
   (game_display.js:150-154) to the deferred-multiattack resume paths.

Ground truth was cross-checked by running the patched C recorder build
(copied to /tmp, rebuilt with NHDBG iteration/movemon/hitmsg/mdamageu
traces + rng counters at each tty boundary) until RNG was byte-identical.
