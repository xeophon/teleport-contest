# C Parity Audit 981: Steed Saddling, Riding, and Kicking (seed9161-wiz-steed)

Date: 2026-08-02. Target session `sessions-extra/seed9161-wiz-steed.session.json`:
brought from FAIL (RNG 5748/5927, Screen 43/105) to PASS (RNG 5927/5927,
Screen 105/105).

## Sources

- `nethack-c/upstream/src/steed.c:27-33` — `can_saddle()` class/shape gate
  (S_QUADRUPED/S_UNICORN/S_ANGEL/S_CENTAUR/S_DRAGON/S_JABBERWOCK plus size and
  corporeality tests).
- `nethack-c/upstream/src/steed.c:36-141` — `use_saddle()`: target selection
  through `getdir()`, refusal branches ("I see nobody there.", "doesn't need
  another one.", minion/shopkeeper/priest refusal, unsaddlable creature), the
  chance formula (steed.c:93-113: Dex + Cha/2 + 2*mtame + 20*ulevel for a tame
  target, riding-skill penalty, Confusion/Fumbling/Glib, tack +10, cursed −50),
  `maybewakesteed()` (steed.c:819-841) and the `rn2(100)` attempt at
  steed.c:129 + success/failure messaging and `put_saddle_on_mon()` inventory
  handoff (steed.c:144-163).
- `nethack-c/upstream/src/steed.c:180-197` — `doride()`: dismount when already
  riding, otherwise getdir + wizard-only `y_n("Force the mount to succeed?")`.
- `nethack-c/upstream/src/steed.c:201-394` — `mount_steed()` access order:
  already-mounted, hallucination, wounded legs with the wizard "Heal your
  leg?" heal-legs detour (do.c:2408-2425 `legs_in_no_shape`, do.c:2449-2484
  `heal_legs(0)`), form checks, visibility, saddle requirement, tameness
  refusal (`--mtame` only when unforced and not Knight, steed.c:308-314), slip
  check with damage (`u.ulevel+mtame < rnd(MAXULEV/2+5)`, steed.c:341-361),
  success path (silent when forced).
- `nethack-c/upstream/src/dokick.c:1256-1282` — `dokick()`: while mounted the
  kick command is a yn prompt "Kick your steed? [yn] (y)" before any
  wounded-legs check.
- `nethack-c/upstream/src/steed.c:414-449` — `kick_steed()`: tameness
  decrement, buck check `u.ulevel + mtame < rnd(MAXULEV/2+5)` (steed.c:441),
  `dismount_steed(DISMOUNT_THROWN)` or "… gallops!" with
  `u.ugallop += rn1(20,30)` (steed.c:448).
- `nethack-c/upstream/src/steed.c:470-816` — `landing_spot()` /
  `dismount_steed()`: landing-choice tie rolls (`!rn2(viable)`, steed.c:543),
  thrown-off message + landing damage `rn1(10,10)` (steed.c:612), wounded legs
  `rn1(5,5)` (steed.c:614), steed release and hero relocation to the landing
  spot.
- `nethack-c/upstream/src/end.c:1107-1120` — wizard-mode "Die?" refusal
  ("OK, so you don't die.") runs synchronously inside `losehp()`; the dismount
  tail (wounded legs, monster placement, hero move) resumes afterwards.
- `nethack-c/upstream/src/dogmove.c:28-132` — `droppables()` skips worn
  monster gear (the worn saddle), so a saddled pet never attempts the
  minvent drop rolls and the apport/dogGoal `rn2(edog->apport)` fallback
  (dogmove.c:573-576) only fires with truly droppable inventory.
- `nethack-c/upstream/src/mon.c:1140-1168` — `mcalcmove()` per-monster and
  via `u_calc_moveamt()` (allmain.c:114-157) for the riding hero
  (`u.umoved` gated), already mirrored by allmain.js.
- `nethack-c/upstream/src/dogmove.c:493-496` — dog_goal returns −2 for a
  ridden steed ("Steeds don't move on their own will"): only static
  distfleeck/wanderer rolls happen while riding.

## JS Changes (js/cmd.js, js/allmain.js)

- New `heroUseSaddle()` (port of `use_saddle()`), wired into the `applyObject`
  item dispatch for `saddle` objects with an `applySaddleDirection`
  direction-prompt mode. Monster visibility, saddle conflict
  (`monsterHasWornSaddle`), refusal branches and the chance formula follow
  steed.c:55-129. Success removes the saddle from the hero inventory, sets
  `owornmask = W_SADDLE` + `misc_worn_check |= W_SADDLE` + `saddled` on the
  pet and keeps `_pet_food_scan_inventory` aliased to the new inventory array
  (the pet scan mirrors C's live `gi.invent`).
- `mountSteed(mon, { force })` rewritten to C's `mount_steed()` access order,
  including the wizard forced path (no --mtame, no slip roll, no message) and
  the wounded-legs → "Heal your leg? [yn]" → `heal_legs(0)` flow spliced in
  via the `rideHealLegMore`/`rideHealLegConfirm` command modes.
- `rideDirection()` now offers "Force the mount to succeed? [yn] (n)" in
  wizard mode through the `rideForceConfirm` mode (doride(), steed.c:185-193);
  prompt text persists on screen after a silent forced mount
  (`_keep_pending_message`).
- dokick `^D` while mounted asks "Kick your steed? [yn] (y)" via the
  `kickSteedConfirm` mode; `kickSteed()` ports `kick_steed()` — decrement
  tameness, buck check, then either thrown-off or the gallop message +
  `u.ugallop += rn2(20)+30`.
- `dismountSteedThrown()` ports `dismount_steed(DISMOUNT_THROWN)`: landing
  spot first, "You are thrown off of the saddled pony!", landing damage, and —
  when the damage kills a wizard-mode hero — defers the wounded-legs roll,
  steed placement and hero relocation through `_steed_thrown_resume` which the
  "Die?" refusal branch (`wizardDieConfirm`, 'n') executes via
  `finishSteedThrownDismount()` before the survival line.
- `heroSetWoundedLegsBothSides()` ports `set_wounded_legs(BOTH_SIDES, ...)`
  (do.c:2428-2448: DEX temporary decrement only when previously unwounded);
  `heroLegsInNoShapeMessage()` ports `legs_in_no_shape()` side/plural wording;
  `maybewakeSteed()` ports `maybewakesteed()`.
- js/allmain.js pet machinery: the drop attempt (`rn2(udist+1)` /
  `rn2(edog->apport)`) and the floor-object scan gate now key off
  C-`droppables()` (any minvent entry with neither `owornmask` nor `worn`)
  instead of `mon.minvent.length`, and so does the `dog_goal` apport fallback
  (both per dogmove.c:31-132 and 573-576).
- js/cmd.js input gating: `rideHealLegMore` added to the two generic
  --More-- dismissal exclusion lists so the heal-leg prompt surfaces after the
  dismissal key instead of being swallowed.

## Tests

New `test/steed-kick.test.mjs` (5 cases): saddle success bookkeeping, saddle
resist, target-refusal guards, kick gallop (tameness--, gallop message,
rn1(20,30) ugallop, turn consumption), and the legs_in_no_shape wording.

Verification runs from the worktree root:

1. `node --input-type=module -e "await import('./js/jsmain.js')"` — loads OK.
2. `node --test test/steed-kick.test.mjs` — 5/5 pass; full suite
   `node --test test/*.test.mjs` 3658/3658 pass.
3. `bash frozen/score.sh` — 49/49 public sessions pass.
4. `node frozen/ps_test_runner.mjs sessions-extra/…` — target
   seed9161-wiz-steed PASS (RNG 5927/5927, Screen 105/105); every previously
   passing extra still passes, and every still-failing extra has metrics
   identical to the base commit (bit-for-bit compared against a `git archive`
   of the base — no runtime slice regressed).

## Recorded-fit note (constant evidence)

The recording is consistent with the mounted-target chance evaluated at 49:
resists at rolls 92 and 58, success at 31 (steed.c:129 `rn2(100) < chance`).
Per steed.c:93-113 the JS side computes chance = 15 (Dex) + floor(9/2) (Cha)
+ 2*mtame + 20*1 (level, tame) + 0 (Wizard riding is Basic per
the Skill_W riding row in nethack-c/upstream/src/u_init.c (P_RIDING, P_BASIC), shared with the already-passing knight riding
sessions). That lands on 49 with the JS pony's tame level of 5. Both tame
value and chance endpoints only feed inequality tests (and the chance roll is
fixed-size), so the recorded stream cannot pin the intermediate constants any
tighter; follow-up work could probe them with a session that saddles at a
known, independently observable tameness (e.g. taming-magic wraps).

## Remaining Steed Gaps (unported / unexercised here)

- Cockatrice-touch petrification when saddling/mounting barehanded
  (steed.c:67-76, steed.c:299-304), amorous-demon refusal (steed.c:77-80),
  long-worm tail mounting (steed.c:251-260), `test_move()`-driven swing-over
  refusal and swallowed/stuck/trapped mounting blocks (steed.c:261-272),
  mtrapped mount refusal message (steed.c:316-322), underwater/levitation/
  stiff-armor mounting blocks (steed.c:323-359).
- Helpless-steed kick branch (`"… stirs."`, steed.c:420-432), Conflict buck
  during dog_move (dogmove.c:1016-1024), kick_saddle gallop mcalcmove
  speed factor for multi-move only (mon.c:1148 — correctly absent for single
  steps, mirroring `svc.context.mv` in cmd.c:3784-3800).
- Voluntary-dismount details: cursed-saddle refusal (steed.c:677-681),
  "with name" flavor (steed.c:682-686), `landing_spot()` abstention from known
  traps/boulders for impaired riders (steed.c:479-560 passes 0-2 —
  the current landingSpot() covers the tie-break economy but not the pass
  structure), dismount-into-trap cascading, `dismount_steed()` water/lava
  pools (steed.c:729-747), `DISMOUNT_ENGULFED`/`DISMOUNT_BONES`/
  `DISMOUNT_POLY` flows, steed-killed-on-dismount fallback (steed.c:762-790).
- `dismount_steed()` `repair_leg_damage` chain (steed.c:583, 621-624) and
  `float_down(0L, W_SADDLE)` pickup interplay after dismount.
- Wounded-leg mount for NON-forced attempts pays the wound branch correctly,
  but the "Heal your leg?" wizard prompt currently assumes the direct
  #ride path (other mount triggers aren't wired).
