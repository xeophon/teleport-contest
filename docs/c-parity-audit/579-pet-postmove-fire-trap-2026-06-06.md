# Pet Post-Move Fire Trap

## Scope

Route tame pet first-entry `FIRE_TRAP` handling through the shared monster fire-trap helper after the C-shaped `mintrap()` prelude.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/monmove.c:1772` routes tame monsters through `dog_move()`.
- `nethack-c/upstream/src/monmove.c:1509` runs `postmov()` after movement and calls `mintrap()`.
- `nethack-c/upstream/src/trap.c:3795` computes known-trap state for the shared monster `mintrap()` path.
- `nethack-c/upstream/src/trap.c:3809` skips floor-trigger traps for in-air monsters before known-trap RNG.
- `nethack-c/upstream/src/trap.c:3812` lets known traps be avoided with the `rn2(4)` gate before learning/effects.
- `nethack-c/upstream/src/trap.c:2957` dispatches monster `FIRE_TRAP` to `trapeffect_fire_trap()`.
- `nethack-c/upstream/src/trap.c:1730` through `:1819` applies monster fire-trap effects: `d(2,4)` damage, visible tower messaging, fire-resistance feedback, golem alternate damage, HP max loss, armor and inventory fire handling, floor-object fire handling, smoke feedback, final visible trap reveal, and killed-monster return.
- `nethack-c/upstream/src/trap.c:2316` can also route monster magic traps into the same fire-trap effect after `rn2(21)`.

## JS Change

- `js/allmain.js` now calls `monsterFireTrapEffect()` from the pet post-move trap branch after harmless and known-trap avoidance checks.
- `monsterFireTrapEffect()` accepts the pet trap-kill cleanup option so lethal pet fire damage can skip the outer pet post-move roll.
- The fire helper now reports visible fire-resistant monsters as uninjured.
- Lethal fire body damage now records the kill but continues through carried armor/inventory fire, floor-object fire, and final visible reveal before cleanup.
- Ordinary monster movement keeps using the same helper, so the pet branch shares the existing fire damage, inventory fire, floor fire, smoke, and trap reveal behavior.

## Tests

- `pet fire trap damages pet through pet movement`
- `lethal pet fire trap removes pet through pet movement`
- `lethal pet fire trap helper marks pet post-move roll skipped`
- `lethal pet fire trap burns carried armor before removing pet`
- `fire-resistant pet fire trap reports uninjured through pet movement`

The tests drive the normal pet movement loop or the shared helper with local fixtures and explicit state. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Pet post-move falling-rock, landmine, and rolling-boulder trap effects remain separate trap parity slices.
- Full pet leash slack/yelp and off-level migration handling remains broader `dog_move()` parity.
