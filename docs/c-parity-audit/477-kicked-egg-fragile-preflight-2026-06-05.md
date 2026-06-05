# C Parity Audit 477: Kicked Egg Fragile Preflight

Implemented the kicked floor-object fragile preflight branch for non-shop eggs. The slice covers egg splat breakage before stack splitting and remote-hole projectile migration, including fertile-egg Luck loss and pyrolisk egg explosion at the original kicked object square, without relying on replay maps, private seeds, player names, move counts, or fixture-specific runtime branches.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:493` through `:501`: `kick_object()` selects only the top floor object, calls `really_kick_object()`, then clears `gk.kickedobj`.
- `nethack-c/upstream/src/dokick.c:610` through `:613`: kicking a floor object prints `You kick ...` before fragile-object handling.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: kicked fragile objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return immediately when breakage succeeds.
- `nethack-c/upstream/src/dokick.c:692` through `:694`: stack splitting occurs after the fragile preflight branch, so a breaking egg stack is deleted as one object.
- `nethack-c/upstream/src/dokick.c:733` through `:738`: object extraction and `bhit(..., KICKED_WEAPON, ...)` projectile flight are only reached when fragile preflight breakage does not return.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` runs `breaktest()`, emits `breakmsg()`, then calls `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:2525` through `:2531`: egg `breakobj()` applies hero-caused Luck loss for own fertile eggs and marks pyrolisk eggs for explosion.
- `nethack-c/upstream/src/dothrow.c:2569` through `:2572`: non-fracture objects are deleted before pyrolisk eggs explode with `d(3,6)` fire damage at the break coordinate.
- `nethack-c/upstream/src/dothrow.c:2584` through `:2605` and `nethack-c/upstream/src/zap.c:1468` through `:1471`: ordinary non-artifact object resistance consumes `rn2(100)` and eggs are breakable after the 1% resistance chance.
- `nethack-c/upstream/src/dothrow.c:2640` through `:2642`: egg breakage always prints `Splat!`, independent of visibility.
- `nethack-c/upstream/src/dokick.c:752` through `:788`: later migrated-object, floor-effect, placement, and stacking handling is skipped after successful fragile preflight breakage.

## JS Changes

- `js/cmd.js`
  - Adds eggs to `kickedFragilePreflightBreakKind()`.
  - Allows stacked fragile preflight objects through `kickFloorObjectSupported()` while keeping non-fragile kicked stacks out of this path.
  - Reuses the hero-caused fragile side-effect helper for egg Luck loss.
  - Adds kicked pyrolisk egg post-removal explosion at the original floor coordinate.
  - Adds quantity-aware floor-object article/subject naming so stack kick messages include the count.

## Tests

- `command kicked fertile egg stack splats before remote projectile flight and penalizes luck`
  - Kicks a stack of three fertile eggs toward a seen remote hole.
  - Asserts the whole stack is removed, no remote impact drop is queued, the message is `You kick 3 eggs.` plus `Splat!`, and Luck decreases by three.
  - Asserts only the `rn2(100)` break-resistance roll is consumed.
- `command kicked pyrolisk egg splats and explodes at original square before remote flight`
  - Kicks a pyrolisk egg toward a seen remote hole.
  - Asserts the egg is removed, no remote impact drop is queued, `Splat!`, `Boom!`, and hero fireball impact appear, and the RNG prefix is `rn2(100)`, `d(3,6)`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked (fertile egg stack|pyrolisk egg|expensive camera|confusion potion|cream pie|glass wand|mirror|lenses|fragile crystal ball)" test/shop-billing-helpers.test.mjs` - pass, 9 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1762 tests
- `node --test` - pass, 1913 tests
- `node --test test/*.mjs` - pass, 1913 tests
- `npm run score` - pass, 44/44 replay sessions
- `git diff --check` - pass

## Remaining

- Shop-owned kicked egg break billing remains separate from this non-shop slice.
- The 1% resistance continuation should keep eggs alive and continue into ordinary kick flight/hole handling; broader pass-through coverage remains open.
- Kicked oil potion explosion remains a separate fragile-preflight slice.
