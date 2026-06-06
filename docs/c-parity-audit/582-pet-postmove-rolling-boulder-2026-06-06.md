# Pet Post-Move Rolling Boulder Trap

## Scope

Route tame pet first-entry `ROLLING_BOULDER_TRAP` handling through a shared monster rolling-boulder helper, while preserving the existing JS launch simulation.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/monmove.c:1772` routes tame monsters through `dog_move()`.
- `nethack-c/upstream/src/monmove.c:1508` runs `postmov()` after movement and calls `mintrap()`.
- `nethack-c/upstream/src/trap.c:1070` classifies `ROLLING_BOULDER_TRAP` as a floor trigger.
- `nethack-c/upstream/src/trap.c:3795` through `:3816` computes monster trap memory, applies the floor-trigger in-air return before known-trap `rn2(4)` avoidance, then teaches the triggerer and eligible witnesses before dispatch.
- `nethack-c/upstream/src/trap.c:2661` through `:2701` applies monster rolling-boulder effects: visible trigger feedback, deaf `Click!` suppression, no hero-branch no-boulder message, boulder launch, and `trap->tseen` only after a successful visible launch.
- `nethack-c/upstream/src/trap.c:3274` through `:3566` implements `launch_obj()`: search `launch` then `launch2`, extract one boulder, roll through monsters, allow rock thrower snatching with `rn2(3)`, process path traps/terrain, and place or consume the boulder.
- `nethack-c/upstream/src/mthrowu.c:340`, `nethack-c/upstream/src/dothrow.c:1937`, and `nethack-c/upstream/include/objects.h:1617` cover the rolling boulder monster hit roll and damage: `rnd(20)` hit roll with the boulder's `+6` object-hit adjustment, then `rnd(20)` damage.

## JS Change

- `js/allmain.js` now extracts ordinary monster `ROLLING_BOULDER_TRAP` handling into `monsterRollingBoulderTrapEffect()`.
- Ordinary monsters and pets now share the same first-entry prelude: harmless in-air exit, known-trap avoidance before learning, then trap learning and effect handling.
- Pet post-move handling now calls the rolling-boulder helper with the pet trap-kill cleanup option.
- Visible monster trigger feedback now suppresses the `Click!` prefix for deaf heroes.
- Boulder monster hit rolls now include the C boulder hit adjustment before applying `rnd(20)` damage.
- Lethal pet rolling-boulder damage sets the pet post-move skip flag when the helper removes the pet.

## Tests

- `pet rolling boulder trap launches boulder through pet movement`
- `visible monster rolling boulder trap with no boulder does not reveal trap`
- `deaf hero sees rolling boulder trigger without click prefix`
- `rolling boulder hit roll includes boulder hit adjustment`
- `known rolling boulder trap can be avoided before launch`
- `in-air pet rolling boulder trap does not launch`
- `lethal pet rolling boulder trap helper marks pet post-move roll skipped`

The tests drive the normal pet movement loop where movement RNG matters and use the shared helper for deterministic no-boulder, deaf, hit-roll, known-trap, in-air, and lethal pet cleanup edges. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `launch_obj()` parity remains broader trap/terrain work: teleport path effects, launch-drop preservation, and floor-effect integration. Rolling-boulder rock-passer harmless hits are covered in audit 583, unseen launch feedback is covered in audit 584, door breakage is covered in audit 585, rock-thrower snatch feedback is covered in audit 586, iron-bars handling is covered in audit 587, boulder chaining is covered in audit 588, hero collision along the rolling path is covered in audit 589, path landmines are covered in audit 590, and pit/hole path effects are covered in audit 591.
- Full pet leash slack/yelp and off-level migration handling remains broader `dog_move()` parity.
