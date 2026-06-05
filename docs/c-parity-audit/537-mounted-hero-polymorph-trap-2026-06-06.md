# Mounted Hero Polymorph Trap

## Scope

Port the C hero `POLY_TRAP` path far enough to cover ordinary movement, `#sit`, antimagic/unchanging blocking, iron/kicking footwear warping, mounted steed polymorph checks, hero system shock, and the object-list/dismount pending routes.

Before this slice, JS only had a narrow sit-only polymorph-trap branch, so ordinary movement into a polymorph trap did not consistently trigger it and mounted heroes never routed the trap through their steed before hero polymorph.

No replay maps, hidden tests, seeds, player names, or runtime shortcuts are used.

## C Reference

- `nethack-c/upstream/src/trap.c:2454` through `:2495` is the hero `trapeffect_poly_trap()` body.
- `nethack-c/upstream/src/trap.c:2471` through `:2477` marks the trap seen and selects the sitting, mounted, or ordinary trigger wording.
- `nethack-c/upstream/src/trap.c:2478` through `:2484` consumes the trap and toggles worn iron shoes between `IRON_SHOES` and `KICKING_BOOTS`.
- `nethack-c/upstream/src/trap.c:2485` through `:2489` handles `Antimagic || Unchanging`, leaving the trap in place.
- `nethack-c/upstream/src/trap.c:2490` through `:2495` calls `steedintrap()`, deletes the trap, updates the map, announces hero polymorph, and calls `polyself(POLY_NOFLAGS)`.
- `nethack-c/upstream/src/trap.c:3152` through `:3158` is the `steedintrap()` `POLY_TRAP` branch, which checks monster magic resistance and wand-class resistance before `newcham()`.
- `nethack-c/upstream/src/trap.c:2981` routes ordinary movement into `POLY_TRAP`; it is not part of the flying/levitating floor-trigger bypass used by pits and webs.
- `nethack-c/upstream/src/polyself.c:469` through `:490` covers the hero system-shock gate before random form selection.

## JS Change

- `js/cmd.js` now has shared polymorph-trap result helpers used by movement and `#sit`.
- Ordinary movement into `POLY_TRAP` now marks the trap seen and reports the correct locomotion message, including flying heroes triggering the trap instead of passing over it.
- Worn iron shoes or kicking boots now consume the trap, print the footwear warp message, and toggle the inventory item between `iron shoes` and `kicking boots`.
- `Antimagic` and `Unchanging` now print "You feel momentarily different." and leave the trap in place.
- Mounted polymorph traps now set the steed on the hero square and run the steed magic-resistance/wand-resistance polymorph gate before deleting the trap and applying hero polymorph/system shock.
- Object-list and dismount object-list pending routes now consume `_pending_poly_trap` through the same shared movement result.

## Tests

- `hero polymorph trap movement blocked by antimagic leaves trap`
- `iron footwear polymorph trap warps boots and removes trap`
- `flying hero still triggers hidden polymorph trap`
- `mounted hero polymorph trap checks steed before hero system shock`
- `dismount object list consumes pending polymorph trap`
- `object list polymorph trap waits until more is dismissed`

The tests use local trap, steed, armor, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Monster-side `POLY_TRAP` behavior still needs a separate `mintrap()` parity slice, including monster footwear polymorph and monster inventory reworn-state details.
- The mounted path currently models steed polymorph and saddle invalidation, but extra C dismount flavor and accident-damage details around `poly_steed()` remain deferred.
- Full random hero `polyself()` form-selection parity is still broader than this slice; this change preserves the existing JS polyself helper and adds only the trap routing and system-shock sequencing needed here.
