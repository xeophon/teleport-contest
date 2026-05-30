# Kicked Floor Object Down-Gate Parity

Date: 2026-05-30

## C Source

- `dokick()` checks adjacent floor objects before falling back to door or nondoor terrain handling: `nethack-c/upstream/src/dokick.c:1452`.
- `kick_object()` selects the top object in the floor pile and calls `really_kick_object()`: `nethack-c/upstream/src/dokick.c:489`.
- `really_kick_object()` rejects boulders, the iron ball, and chain before computing kick range and printing `You kick ...`: `nethack-c/upstream/src/dokick.c:517`, `nethack-c/upstream/src/dokick.c:558`, `nethack-c/upstream/src/dokick.c:612`.
- The object is extracted and launched through `bhit(..., KICKED_WEAPON, ...)`: `nethack-c/upstream/src/dokick.c:733`.
- Kicked-object flight calls `ship_object()` when the next square has a down-gate, and `down_gate()` prioritizes down stairs/ladders before seen holes/trapdoors: `nethack-c/upstream/src/zap.c:4049`, `nethack-c/upstream/src/dokick.c:1651`, `nethack-c/upstream/src/dokick.c:1943`.

## JS Gap

- The JS `kickDirection` command handled invisible targets, statue traps, doors, and terrain, then fell through to `You kick at empty space.`.
- Adjacent floor objects were not selected, extracted, or routed into the existing down-gate migration queue.

## Implemented

- Added a narrow command-level kicked floor-object branch before door/terrain fallback.
- The branch currently covers ordinary visible, unburied, non-shop, non-gold, non-container, non-fragile single objects.
- Added C-shaped kick range calculation for the covered path, including strength, item weight, martial role, air/water level, ice, grease, and blocked-next-square adjustments.
- Reused the existing remote projectile `ship_object()`-style down-gate helper so stairs, ladders, special stairs, seen holes, and seen trapdoors share migration metadata and delivery behavior.
- Preserved local landing on a no-drop result by placing the kicked object on the gate square after impact-drop side effects.

## Tests

- Added `command kick ordinary floor object through seen remote hole`.
- Added `command kick ordinary floor object down stairs records reciprocal metadata`.

## Remaining Gaps

- Full kick-object parity still needs stacks, gold scatter and costly gold, shop-floor billing, containers and lock/impact damage, fragile pre-flight `hero_breaks()`, monster hits/catches, web and iron-bar interactions, boulders, ball/chain, normal non-gate flight, and broader multi-shop impact-drop debt.

## Verification

- `node --check js/cmd.js`
- `node --test test/shop-billing-helpers.test.mjs`
