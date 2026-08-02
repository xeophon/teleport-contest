# C-parity audit — wizard.c / makemon.c harassment machinery (965)
Date: 2026-08-01 · target session: sessions-extra/seed9150-wizard-harass-intervene.session.json

## Scope
Wizard of Yendor interruption machinery driving demigod harassment after the
Wizard's death: `wizdeadorgone()` (wizard.c:806-826) →
`u.uevent.udemigod + u.udg_cnt = rn1(250,50)`; the per-turn driver in
allmain.c:359-368 (`intervene()` on expiry, counter reset `rn1(200,50)`);
`intervene()`'s branches (wizard.c:780-803): 0/1 "vaguely nervous", 2
`rndcurse()`, 3 `aggravate()`, 4 `nasty()`, 5 `resurrect()`;
plus the monster spawn/move/bear-trap side-effects the session exercises.

## What was ported/fixed this wave (wave-5 continuation)

- js/mklev.js `makemon()`: S_LEPRECHAUN class (`mlet === 'l'`) spawns asleep
  (makemon.c:1327-1329) — fixes the Delphi leprechaun walking into the hero and
  two extra distfleeck rn2(5) per turn (rng divergence at flat index 5604).
- js/allmain.js hostile-mover trap entries: BEAR_TRAP case in
  moveMonsterTowardHero() monster postmove path — `mtrapped`, message, `d(2,4)`
  damage, iron-shoes exemption (trapeffect_bear_trap monster branch,
  trap.c:1526-1560); monsterKnowsTrap/`rn2(4)` pre-evade honored (trap.c:3796).
  New helpers `monsterWearingIronShoes` (trap.c:1555 wearing_iron_shoes) and
  `MONSTER_MSIZE_BY_NAME` msize fallback; m_harmless_trap()'s BEAR_TRAP clause
  (trap.c:1125-1129) now resolves monster size from the permonst table
  (monsterTrapHarmless previously only consulted mklev-table flags and missized
  MZ_SMALL monsters like the jackal — regressed seed0014 until fixed).
- Wizard-death revival timing: monster attacks that drop the hero to 0 hp in
  wizard/explore mode now call `restoreHeroHpForUnresolvedWizardDeath()`
  (end.c:704-758 savelife arithmetic) from both the generic multiattack loop
  (allmain.js ~5910) and the deferred-multiattack resume damage sites
  (cmd.js:63810/63850).  This reproduces C's synchronous
  done()->die()->savelife() mid-burst (end.c:1108-1116 paranoid_query) as far as
  the PRNG-relevant HP state goes (fixes the missing `rn2(100) @
  regen_hp(allmain.c:659)` at flat 7641 — turn-tail regen must see the
  post-revival hp).
- game_display.js statusline: HP is held at 0 while `game._death_pending_confirm`
  is latched so prompt-era pages display hp floor like C (fixes seed5002).
- js/wizard.js `nasty()` spawn announcement restored
  ("A leocrotta suddenly appears next to you!", makemon.c:1485-1500) including
  newsym.
- Counted-search stop: the pending-time loop now runs monster_nearby()-equivalent
  (hack.c:4103-4127, allmain.c:495-510) after each pass; on firing it clears the
  search occupation, prints "You stop searching.", and sets
  `_counted_repeat_finish_monsters_once` so an extra monster phase runs
  (allmain.c:212-225).

## Result
seed9150: RNG 7685/7685 (100%).  Screens 152/223 (cursors 162/223).
All 44 public sessions still pass (frozen/score.sh); sessions-extra suite
spot-verified green (9004/9005 sampled, plus full run pre-cleanup).

## NOT yet ported / known gaps (this subsystem)
1. **Wizard-death prompt chain mid-monster-burst display interleave.**  In C,
   done()/die() blocks mid-mhitu burst: hits page -- "--More--" -- "You die..."
   page -- "Die? [yn] (n)" query (non-dismiss keys swallowed) -- refusal revives
   and the remaining attack slots then pages continue
   ("OK, so you don't die.  The leocrotta bites! ...").  The JS pipeline computes
   the identical RNG sequence but renders all burst pages before surfacing the
   death pages, keeps 'You die...' stuck in `_queued_message_after_more` (the
   pending-more pump is preempted by `_attack_resume_after_more` /
   `_deferred_multiattack_after_more` continuations), and splits pages by a
   different packing rule.  seed9150 screens 152-222 all hinge on this.
   Next fixer: re-approach at cmd.js:~63790 (_deferred_multiattack_after_more
   resume loop) — pause slot iteration at the fatal hit, surface the death pages
   through command_mode deathDieMore/wizardDieConfirm, resume saved slots after
   refusal.  Careful: knockback rn2(3)/rn2(6) belong to the slot AFTER its
   damage roll (uhitm.c:5258/5269) — they must stay with their slot when the
   burst is split at a death boundary.
2. Non-adjacent-spawn variants of intervene-case messaging (resurrect()'s
   "voice booms out" chain) — untested by this session's screens.
3. `restoreHeroHpForUnresolvedWizardDeath` currently models savelife() hp
   restoration only; hunger/sickness/recovery side-effects of savelife
   (end.c:714-724 init_uhunger/make_sick cures) are not modeled here.
