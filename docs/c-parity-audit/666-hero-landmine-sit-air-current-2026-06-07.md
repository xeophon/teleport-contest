# 666 - Hero Landmine Sit Air Current

## C Source

- `nethack-c/upstream/src/sit.c:414-418` checks floor reachability first; normal-level levitation returns with `You tumble in place.` before trap handling.
- `nethack-c/upstream/src/engrave.c:187-210` allows flying heroes to reach the floor, so flying `#sit` can enter the trap path.
- `nethack-c/upstream/src/sit.c:498-503` prints `You land.` or `You sit down.`, then calls `dotrap(trap, VIASITTING)`.
- `nethack-c/upstream/src/trap.c:1086-1094` treats `VIASITTING` as a plunged state for `check_in_air()`, so flying does not take the generic in-air floor-trigger skip before trap effects.
- `nethack-c/upstream/src/trap.c:3035-3039` still applies the ordinary known-trap `rn2(5)` escape prelude before the landmine effect when eligible.
- `nethack-c/upstream/src/trap.c:2533-2558` rolls landmine damage before the hero branch, then uses the air-current path for flying heroes: hidden mines may return after `rn2(3)`, known mines print the trigger message and may return after a later `rn2(3)`.
- `nethack-c/upstream/src/trap.c:2585-2596` converts exploding landmines to a pit and recursively calls `dotrap(..., RECURSIVETRAP)` if a trap remains; for still-flying heroes this produces the seen-pit over message rather than pit damage.

## Port Notes

- `sitLandmineResult()` now calls the normal landmine helper instead of forcing the grounded branch, allowing flying `#sit` to use the air-current path.
- Hidden flying air-current fizzle now preserves the `You land.` prefix instead of returning an empty message.
- Air-current explosions now run the same converted-pit follow-up as ordinary landmine explosions, which gives flying sit explosions the recursive seen-pit over message.
- The generic `sitTriggerTrap()` known-trap escape prelude remains in front of landmine dispatch, matching C's `dotrap()` pre-effect ordering.

## Tests

- `flying hero sitting on hidden land mine can land without discovery`
- `flying hero sitting on hidden land mine can air-current detonate`
- `flying hero sitting on known land mine can escape before air currents`
- Existing levitation reachability and ordinary movement canaries still cover non-sit in-air behavior.
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "land mine|landmine|sitting on seen bear trap" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Full `blow_up_landmine()` terrain/object fallout remains partial, as tracked by `665-hero-landmine-recursive-pit-2026-06-07.md`.
- Force/plunge landmine entry remains separate from sitting because force flags bypass the ordinary in-air floor-trigger precheck and grounded branch selection differs.
- Sitting on an object above a landmine is C-shaped before the trap branch, but it does not have a dedicated landmine canary.
