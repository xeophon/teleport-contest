# Subagent Findings 67: Forced Chest Occupation Tick

## Scope

Audit and implement the narrow `#force` occupation behavior that happens before the lock success roll: blade breakage during long prying attempts and blunt-weapon `wake_nearby(FALSE)` handling.

## Upstream C Anchors

- `nethack-c/upstream/src/lock.c:216` starts `forcelock()`.
- `nethack-c/upstream/src/lock.c:219` aborts if the box is no longer on the hero square.
- `nethack-c/upstream/src/lock.c:222` gives up when `usedtime++ >= 50`, `!uwep`, or no hands; the 50-turn effort exercises Dexterity for blades and Strength for blunt weapons.
- `nethack-c/upstream/src/lock.c:229` applies the blade break check before the success roll: `rn2(1000 - uwep->spe) > 992 - greatest_erosion(uwep) * 10`, then `!uwep->cursed`, then `!obj_resists(uwep, 0, 99)`.
- `nethack-c/upstream/src/lock.c:237` prints `Your <weapon> broke!` or `One of your <weapons> broke!`, consumes the weapon with `useup(uwep)`, gives up, and exercises Dexterity without attempting the lock that tick.
- `nethack-c/upstream/src/lock.c:244` calls `wake_nearby(FALSE)` on every blunt forcing tick before the success roll.
- `nethack-c/upstream/src/lock.c:246` rolls `rn2(100) < chance` only after the blade-break or blunt-wake branch completes.
- `nethack-c/upstream/src/lock.c:252` sends blade success to `breakchestlock(box, FALSE)` and blunt success to `breakchestlock(box, !rn2(3))`.
- `nethack-c/upstream/src/lock.c:707` classifies forcing weapons as blade only when `is_blade(uwep) && !is_pick(uwep)`.
- `nethack-c/upstream/src/lock.c:739` prints the blade prying start message; `lock.c:741` prints the blunt bashing start message.
- `nethack-c/upstream/src/lock.c:744` derives forcing chance from `objects[uwep->otyp].oc_wldam * 2`.
- `nethack-c/upstream/src/mon.c:4367` implements `wake_nearby(FALSE)` as `wake_nearto_core(u.ux, u.uy, u.ulevel * 20, FALSE)`.
- `nethack-c/upstream/src/mon.c:4379` wakes dead-filtered monsters with `dist2 < distance`.
- `nethack-c/upstream/src/mon.c:4383` reports visible sleeping monsters before clearing `msleeping`.
- `nethack-c/upstream/src/mon.c:4386` clears `STRAT_WAITMASK` only for non-unique monsters; the `FALSE` petcall skips pet tracking cleanup.

## JS Findings

- `js/cmd.js` already distinguished blade versus blunt forcing and `finishForceLock()` already skipped the chest-destruction `rn2(3)` roll for blade success.
- The occupation loop in `js/allmain.js` went straight from the 50-turn give-up guard to the success roll, so blade weapons could not break and blunt forcing did not wake nearby sleepers.
- The `#force` command did not preserve the starting weapon on `game._force_lock_occupation`, which the per-tick blade break path needs.

## Implementation

- Added `processForceLockOccupationTick()` in `js/cmd.js` and called it from `processForceLockOccupation()` before the success `rn2(100)` roll.
- Stored the force weapon on `game._force_lock_occupation` when the command starts.
- Implemented the C blade break ordering and RNG shape:
  - break roll from `rn2(1000 - spe)`;
  - greatest erosion from `oeroded`/`oeroded2`;
  - cursed weapons short-circuit before object resistance;
  - ordinary object resistance consumes `rn2(100)`;
  - break consumes one wielded item, prints the C-shaped break/give-up messages, exercises Dexterity, and stops the occupation without rolling success.
- Implemented blunt `wake_nearby(FALSE)` behavior for living monsters within `u.ulevel * 20` distance:
  - visible sleeping monsters report waking;
  - `msleeping` is cleared without anger;
  - paralysis/frozen state is not cleaned up;
  - non-unique wait strategy is cleared;
  - unique wait strategy and pet tracking are left alone.
- Added a missing-weapon give-up before either blade or blunt tick handling so stale occupation state cannot proceed after the wielded item is gone.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- eroded blade breakage happens before success and consumes the object resistance and Dexterity exercise RNG;
- cursed blades cannot break and do not roll object resistance;
- blunt forcing wakes nearby sleepers without anger or paralysis cleanup;
- unique monsters wake but retain wait strategy;
- missing blunt weapons give up before waking sleepers;
- blade forcing does not wake sleepers on an unbroken tick;
- the command-created occupation stores the blade object for later ticks.

Focused verification:

- `node --check js/cmd.js`
- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='force|forced|destroyed box' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- The 50-turn give-up path still has broader occupation parity gaps around exact exercise state, no-hands/polyself handling, and interruption contracts.
- `#force` chance still depends on local weapon-name heuristics instead of the object registry's C `oc_wldam` metadata.
- `wake_nearby(FALSE)` still omits buried-zombie disturbance and exact mimic/disguise reveal behavior.
- Broader forced-chest follow-ups remain around ice-box corpse timers and other container-content side effects that belong in the object registry and timer layers.
