# Pet Post-Move Anti-Magic And Sleep Gas

## Scope

Route tame pet first-entry `ANTI_MAGIC` and `SLP_GAS_TRAP` handling through the same C-shaped `mintrap()` helpers already used by ordinary monsters.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/monmove.c:1772` routes tame monsters through `dog_move()`.
- `nethack-c/upstream/src/monmove.c:1508` runs `postmov()` after movement and calls `mintrap()`.
- `nethack-c/upstream/src/trap.c:3795` computes known-trap state for the shared monster `mintrap()` path.
- `nethack-c/upstream/src/trap.c:3809` skips floor-trigger traps for in-air monsters before known-trap RNG.
- `nethack-c/upstream/src/trap.c:3812` lets known traps be avoided with the `rn2(4)` gate before learning/effects.
- `nethack-c/upstream/src/trap.c:1563` through `:1584` applies monster sleep gas, including `rnd(25)`, visible sleep messaging, and trap reveal.
- `nethack-c/upstream/src/trap.c:2328` through `:2436` applies monster anti-magic effects: iron-footwear drain, magic/breath cooldown drain, resistant implosion damage, artifact adders, trap reveal, and monster cleanup on death.

## JS Change

- `js/allmain.js` now calls `monsterAntiMagicTrapEffect()` and `monsterSleepGasTrapEffect()` from the pet post-move trap branch.
- The anti-magic helper accepts the existing pet cleanup option so lethal pet implosions can use the same removal path as other pet trap deaths.
- Pet sleep gas now learns/triggers the trap, rolls `rnd(25)` for susceptible pets, freezes them, reveals the trap when visible, and prints the visible sleep message.
- Pet anti-magic now uses the ordinary monster helper for visible lethargy, `d(2,6)` special-attack cooldown drain, resistant `rnd(4)` implosion damage, and visible trap-kill wording.

## Tests

- `pet anti-magic trap drains magical attack cooldown through pet movement`
- `lethal pet anti-magic implosion removes pet through pet movement`
- `pet sleep gas trap sleeps pet through pet movement`

The tests drive the normal pet movement loop with local fixtures and explicit state. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Pet post-move rolling-boulder trap effects remain a separate trap parity slice.
- Full pet leash slack/yelp and off-level migration handling remains broader `dog_move()` parity.
