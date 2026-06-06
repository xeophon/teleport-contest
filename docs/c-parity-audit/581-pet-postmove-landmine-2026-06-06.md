# Pet Post-Move Land Mine Trap

## Scope

Route tame pet first-entry `LANDMINE` handling through a shared monster land-mine helper.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/monmove.c:1772` routes tame monsters through `dog_move()`.
- `nethack-c/upstream/src/monmove.c:1508` runs `postmov()` after movement and calls `mintrap()`.
- `nethack-c/upstream/src/trap.c:1064` classifies `LANDMINE` as a floor trigger.
- `nethack-c/upstream/src/trap.c:1112` makes floor-trigger traps harmless for in-air monsters before effect handling.
- `nethack-c/upstream/src/trap.c:3791` through `:3816` computes known-trap state, applies the known-trap `rn2(4)` escape before learning, then teaches the triggering monster and eligible witnesses before dispatching the effect.
- `nethack-c/upstream/src/trap.c:2528` through `:2641` applies monster land-mine effects: roll `rnd(16)`, reduce damage for iron shoes, skip detonation when `rn2(cwt + 1) < 400`, print visible or audible blast feedback, apply forced damage, and recursively trigger the resulting pit for survivors.
- `nethack-c/upstream/src/trap.c:3172` through `:3215` handles the broader `blow_up_landmine()` environmental side effects, including scatter, wakeup, engraving deletion, doors, drawbridges, liquid fill, pit conversion, and boulder pit filling.

## JS Change

- `js/allmain.js` now extracts ordinary monster `LANDMINE` handling into `monsterLandmineTrapEffect()`.
- Ordinary monsters and pets now share the same post-move land-mine prelude: harmless in-air exit, known-trap avoidance before learning, then trap learning and effect handling.
- Land-mine effects now roll `rnd(16)` before the body-weight gate, reduce blast damage for worn iron footwear, reveal visible blasts, preserve the audible off-screen blast message, and convert detonated mines to non-user pits.
- Surviving grounded monsters immediately route through `monsterPitTrapEffect(..., { forceTrap: true })`, matching C's forced recursive `mintrap()` into the new pit without a second known-trap avoidance roll.
- Lethal pet land-mine damage uses the common trap-kill cleanup option so the outer pet post-move roll is skipped after removal.

## Tests

- `pet land mine helper detonates and drops pet into resulting pit`
- `light pet land mine trigger roll learns but does not detonate`
- `in-air pet land mine does not roll trigger effects`
- `known pet land mine helper can be avoided before blast effects`
- `lethal pet land mine helper marks pet post-move roll skipped`
- `pet iron shoes reduce land mine blast before pit damage`

The tests drive the normal pet movement loop where movement RNG matters and use the shared helper for deterministic blast, death, known-trap, and footwear edges. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `blow_up_landmine()` environmental side effects remain broader trap/terrain parity: scatter, wakeup, doors, drawbridges, engraving deletion, liquid fill, and boulder pit filling.
- Full pet leash slack/yelp and off-level migration handling remains broader `dog_move()` parity.
