# Monster Polymorph Trap

## Scope

Port the monster-side `POLY_TRAP` path used by `mintrap()` for ordinary monsters and pets.

Before this slice, monsters could step onto polymorph traps without learning the trap, visible feedback, magic-resistance handling, iron-footwear warping, or random monster polymorph.

No replay maps, hidden tests, seeds, player names, or runtime shortcuts are used.

## C Reference

- `nethack-c/upstream/src/trap.c:3733` through `:3818` is `mintrap()`'s trap dispatch and known-trap avoidance.
- `nethack-c/upstream/src/trap.c:1061` shows `POLY_TRAP` is not a floor trigger, so flying/floating monsters do not bypass it through `check_in_air()`.
- `nethack-c/upstream/src/trap.c:2497` through `:2524` is the monster branch of `trapeffect_poly_trap()`.
- `nethack-c/upstream/src/trap.c:2500` through `:2514` warps worn iron/kicking footwear and re-wears it.
- `nethack-c/upstream/src/trap.c:2516` through `:2520` handles magic resistance, wand-class resistance, `newcham()`, and trap visibility timing.
- `nethack-c/upstream/src/mon.c:6058` through `:6067` is `shieldeff_mon()`, which can print "`<monster> resists!`" when the square is visible.

## JS Change

- `js/cmd.js` now exports `monsterPolyTrapEffect()`, a trap-specific monster helper that preserves the C order: worn iron footwear first, then magic resistance, then wand-class resistance, then random `newcham()`-style polymorph.
- Worn monster iron shoes now toggle to kicking boots and remain worn via `W_ARMF`; kicking boots use the same shared footwear warp helper.
- `js/allmain.js` imports `POLY_TRAP` and routes both ordinary monster movement and pet movement through the monster polymorph trap helper.
- Monsters now learn triggered polymorph traps via the existing `monsterTriggerTrap()` path, visible magic resistance can report "`The <monster> resists!`", successful or attempted non-resisted polymorph can mark the trap seen, and the trap remains in place in every monster-side outcome.
- In-air monsters still trigger polymorph traps, matching C's non-floor-trigger behavior.

## Tests

- `visible monster polymorph trap polymorphs monster and leaves trap`
- `magic resistant monster polymorph trap is visible and leaves trap`
- `in-air monster still triggers polymorph trap`
- `monster iron shoes warp on polymorph trap and stay worn`
- `pet polymorph trap uses pet movement trap path`

The tests use local monster, trap, armor, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Monster path-selection parity around known harmless polymorph traps remains broader than this slice. The trigger path now applies known-trap `rn2(4)` avoidance, but route choice still uses the existing JS trap-avoidance framework.
- Extra inventory fallout from `newcham()` such as full monster armor breakage, unwielding, and carry-capacity drops remains part of the wider monster polymorph parity work.
