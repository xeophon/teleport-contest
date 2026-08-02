# seed9150-wizard-harass-intervene — findings

## What the session covers

Wizard of Yendor death/resurrection bookkeeping + demigod harassment (`wizard.c`):

1. `#wizgenesis Wizard of Yendor` — unique force prompt ("Creating doppelganger
instead; force Wizard of Yendor? [yn] (n)" answered `y`), adjacent spawn.
2. `#wizkill` getpos monster-cycle kill ("You kill the Wizard of Yendor!") →
`wizdeadorgone()` sets `u.uevent.udemigod`, `u.udg_cnt = rn1(250,50)` (=50).
3. `#wizwish the Amulet of Yendor` + the 5.0 first-pickup bonus wish +
bestow-wish chain.
4. `^V oracle` levelport renaming to Delphi (lev_by_name special level).
5. `do` — drop the Amulet.
6. 34 counted searches: at rng[7429] `intervene()` fires case 4 (`rn2(6)=4` @
wizard.c:787) → `nasty()` (rng rn2(10) @ wizard.c:607, rnd(1) @ 620,
rn2(44) @ pick_nasty 541, `d(6,8)` newmonhp, `rnd(4)` @ wizard.c:695) —
"A leocrotta suddenly appears next to you!" then "You stop searching."
Leocrotta mauls the wizard repeatedly ("You die...--More--", "Die? [yn] (n)",
"OK, so you don't die." x5); session ends mid-maul at T:54.

## Final JS score (this branch, slice/cont9150)

→ **PASS: RNG 7685/7685 (100%); Screens 152/223 (cursors 162/223)** — partial.
First screen divergence at step 152: the leocrotta maul page choreography.

## Divergences fixed in this wave (post-base)

Base at merge: RNG 5668/7685, Screens 143/223.

1. **rng[5604] step 122 — distfleeck miscount.** JS evaluated two extra
   `rn2(5)` (distfleeck-equivalent) calls per turn in the Delphi monster phase:
   the wizards' leprechaun was moving instead of sleeping.
   C ref: makemon.c:1327-1329 — `case S_LEPRECHAUN: mtmp->msleeping = 1;` — the
   whole 'l' class (leprechauns, lurkers above, trappers) always spawns asleep.
   * js/mklev.js: makemon() now sets `mon.msleeping = 1` for `ptr.mlet === 'l'`.

2. **rng[5645] step 122 — missing bear-trap entry.** A Mordor orc marches onto
   a bear trap at (13,17): C does `d(2,4)=3 @ trapeffect_bear_trap(trap.c:1554)`
   (monster branch: trapped + thitm damage), then per-turn `rn2(40) @
   mintrap(trap.c:3751)` escape attempts while `mtrapped`.
   * js/allmain.js: added the hostile-mover bear-trap entry case in
     `moveMonsterTowardHero`'s post-move trap section (mnemonic:
     monsterAvoidsKnownTrapBeforeEffect/monsterTriggerTrap/`mon.mtrapped = 1`/
     `d(2,4)` damage), mirroring trap.c:1526-1560 + mintrap's already_seen
     evade gate at trap.c:3796-3816; the trapped-turn escape roll already
     existed via `monsterTrappedTrapTurn` (allmain.js:12834).
     Also added `monsterWearingIronShoes()` (trap.c:1555 wearing_iron_shoes).

3. **seed0014 regression from (2)** — a jackal (MZ_SMALL) was being trapped;
   C calls the trap harmless for it (m_harmless_trap, trap.c:1125-1129:
   `msize <= MZ_SMALL || amorphous || whirly || unsolid`).  Fixed
   `monsterTrapHarmless()` BEAR_TRAP case to resolve msize through the permonst
   table (allmain.js `MONSTER_MSIZE_BY_NAME` from js/permonst.js MONS, falling
   back through existing flags).

4. **rng[7641] step 192 — missing `rn2(100) @ regen_hp(allmain.c:659)`.**
   The wizard-mode "Die? no" refusal revives the hero *synchronously* mid-burst
   in C (mhitu.c mdamageu → end.c:1108-1116 paranoid_query → savelife
   end.c:704-758), so the turn tail's regen ran with hp 5/16 (+ rolled).
   The JS port deferred the prompt chain but never revived, pinning uhp at 0,
   which suppressed the regen roll.  Fix: `restoreHeroHpForUnresolvedWizardDeath()`
   (an existing-but-orphaned helper, allmain.js:2619) is now invoked the moment a
   monster attack drives the hero to 0 with wizard/explode mode active — in the
   generic multiattack loop (allmain.js:5900s) and in the deferred-multiattack
   resume sites (cmd.js:63800-63860 damage points).  The status line still shows
   HP:0 during the prompt pages: game_display.js renderStatus now holds the
   displayed HP at 0 whenever `game._death_pending_confirm` is latched (C's
   prompt pages show the pre-refusal value); cleared when the prompt resolves.

5. **seed5002 regression from (4)** — fixed by the display hold in (4).
   (`_death_status_hp_before_zero` mechanism already existed for that path.)

6. **Screens 149-151 — spawn message + occupation stop.**
   - The nasty() spawn now prints "A leocrotta suddenly appears next to you!"
     (C: makemon.c:1485-1500, the !in_mklev && !MM_NOMSG announce branch with
     next2u/close-by suffixing) and `newsym`s the monster so it shows on the map.
   - The counted search stops immediately when the spawn leaves a hostile
     monster adjacent (C: allmain.c:495-510 — monster_nearby() hack.c:4103-4127
     gate after every occupation tick), message "You stop searching.",
     `T:51` (not 52) and `g._counted_repeat_finish_monsters_once = 1` so C's
     one-extra-monster-pass after an interrupted counted action
     (allmain.c:212-225 movemon loop) runs in the same rhack.

## Remaining divergences

**Screens 152-222 (71 screens)** — the leocrotta maul/death-page choreography:

C's pages bundle: `You stop searching.  The leocrotta hits!  The leocrotta
bites!--More--`, "You die...--More--", "Die? [yn] (n)" (holding keys 5/s are
swallowed while a prompt page is up), "OK, so you don't die+"-prefixed
continuation pages.  The JS engine computes the same RNG stream (all hits,
damage, knockbacks, revivals) but:
- schedules the burst pages one keystroke later than C's tty blocking model
  (C suspends *inside* the mid-burst hits with done() -> paranoid_query; JS
  currently resolves the full burst and keeps 'You die...' stuck in
  _queued_message_after_more because the pending-more pump at cmd.js:64400s is
  preempted by the attack-resume pipeline);
- page splits differ ("hits bites hits" 3-pack pages vs C's die-bounded pages);
- the burst's hit damage is deferred to after the --More-- dismissal
  (_damage_after_topline_more) so intermediate HP status values lag one page.

A faithful fix needs the fatal-hit slot to pause the chain, surface
'You die...'/'Die?'/revival inline and resume remaining slots (an earlier
attempt in this work at cmd.js:63880 + the cmd.js:62565 dismissal gate was
started but reverted: it reordered the knockback rn2(3)/rn2(6) past the deferred
hit application and desynced rng at 7587 — restart from there).
