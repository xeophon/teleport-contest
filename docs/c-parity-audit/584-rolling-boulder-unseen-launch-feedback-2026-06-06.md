# Rolling Boulder Unseen Launch Feedback

## Scope

Cover the C `ROLL | LAUNCH_UNSEEN` prelude for monster-triggered rolling boulder traps when the triggering monster is not visible but a boulder is actually launched.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:2661` through `:2703` routes monster-triggered `ROLLING_BOULDER_TRAP` effects. Unseen triggerers use `style = ROLL | LAUNCH_UNSEEN`; visible triggerers print the `Click! <Mon> triggers ...` message and use plain `ROLL`.
- `nethack-c/upstream/src/trap.c:3274` through `:3293` finds a boulder at `launch`, then `launch2`, and extracts one boulder before motion. No boulder means the monster branch stays silent and does not reveal the trap.
- `nethack-c/upstream/src/trap.c:3319` through `:3329` handles `ROLL | LAUNCH_UNSEEN`: if the launch square can be seen, `You see a boulder start to roll.`; if not seen and hallucinating, `You hear someone bowling.`; otherwise the hero hears rumbling nearby or in the distance using `distu(start) <= 16`.
- `nethack-c/upstream/src/trap.c:2697` sets `trap->tseen` only after a successful visible-trigger launch, not merely because an unseen launch was seen or heard.

## JS Change

- `js/allmain.js` now emits C-shaped launch feedback when `monsterRollingBoulderTrapEffect()` finds a boulder but the triggerer is not visible.
- A launch square visible via `cansee()` reports `You see a boulder start to roll.`
- A remembered-only launch square is not treated as visible and falls through to the audible branch.
- An unseen launch square reports `You hear rumbling nearby.` or `You hear rumbling in the distance.` based on squared distance from the hero to the launch square.
- Hallucinating heroes hear `You hear someone bowling.`
- Deaf heroes get no unseen launch sound unless they can see the launch square.
- Unseen launch feedback does not mark the trap seen and is not emitted for no-boulder launches.

## Tests

- `unseen rolling boulder launch visible at launch square reports rolling start`
- `remembered-only rolling boulder launch is heard instead of seen`
- `unseen rolling boulder launch heard nearby when launch square is unseen`
- `unseen rolling boulder launch heard in distance from far launch square`
- `hallucinating hero hears unseen rolling boulder launch as bowling`
- `deaf hero gets no unseen rolling boulder launch sound`

The tests use local trap, boulder, monster, visibility, status, position, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `launch_obj()` parity remains broader trap/terrain work: hero collision along the rolling path, path trap effects, boulder chaining, launch-drop preservation, and floor-effect integration. Rolling-boulder door breakage is covered in audit 585, rock-thrower snatch feedback is covered in audit 586, and iron-bars handling is covered in audit 587.
