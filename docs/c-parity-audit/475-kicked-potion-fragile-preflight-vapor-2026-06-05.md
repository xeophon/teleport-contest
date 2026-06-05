# C Parity Audit 475: Kicked Potion Fragile Preflight Vapor

Implemented the kicked floor-object fragile preflight branch for adjacent non-oil potions. The slice covers ordinary potion shatter and hero vapor effects before remote-hole projectile migration, without relying on replay maps, private seeds, player names, move counts, or fixture-specific runtime branches.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:612`: kicking a floor object prints the `You kick ...` message before fragile-object handling.
- `nethack-c/upstream/src/dokick.c:678`: kicked fragile objects call `hero_breaks(gk.kickedobj, ox, oy, 0)` and return before range, flight, and hole handling when breakage succeeds.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` runs `breaktest()`, emits `breakmsg()`, then calls `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:2498` through `:2518`: adjacent non-lit-oil potion breakage emits the vapor prelude and calls `potionbreathe(obj)`.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2602`: `breaktest()` consumes the object-resistance roll and breaks all potion objects after the 1% resistance chance.
- `nethack-c/upstream/src/dothrow.c:2633` through `:2638`: visible potion breakage uses the `shatters` message.
- `nethack-c/upstream/src/potion.c:2027` through `:2040`: confusion vapor prints the dizziness message and consumes `rnd(5)` for duration.
- `nethack-c/upstream/src/potion.c:2071` through `:2081`: blindness vapor follows the same adjacent vapor shape with `rnd(5)`.

## JS Changes

- `js/cmd.js`
  - Allows non-oil potions through `kickedFragilePreflightBreakKind()` using the existing potion effect classifier.
  - Calls `brokenPotionBreathe(obj, x, y, messages)` from the kicked fragile floor-object break path after the shatter message and before removal.
  - Leaves oil excluded from this slice because lit oil dispatches through `explode_oil()` in C and needs its own branch.

## Tests

- `command kicked confusion potion breaks and breathes before remote projectile flight`
  - Kicks an adjacent visible potion of confusion toward a seen remote hole.
  - Asserts the floor object is removed at its original square and is not queued to the remote level.
  - Asserts `You kick a potion of confusion.`, `A potion of confusion shatters!`, `You smell a peculiar odor...`, and `You feel somewhat dizzy.`.
  - Asserts no `falls through the hole`, `Thump`, hit, miss, or muffled remote-flight wording appears.
  - Asserts the hero gains confusion status and the RNG label sequence is exactly `rn2(100)`, then `rnd(5)`.

## Verification

- `git diff --check` - pass
- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked (cream pie|confusion potion|glass wand|mirror|lenses|fragile crystal ball)" test/shop-billing-helpers.test.mjs` - pass, 6 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1759/1759
- `node --test` - pass, 1910/1910
- `node --test test/*.mjs` - pass, 1910/1910
- `npm run score` - pass, 44/44

## Remaining

- Lit oil explosion and unlit oil vapor/break details remain separate from this non-oil potion branch.
- Additional vapor canaries for blindness, sleeping, wet towels, breathless forms, and eyeless forms remain useful coverage around the shared `brokenPotionBreathe()` helper.
- Shop-owned kicked floor-object break billing remains excluded by the current kicked floor-object support gate and should be handled separately from this non-shop slice.
- The 1% resistance continuation should keep the object alive and continue into flight/hole handling; broader pass-through coverage remains open.
- Kicked camera demon release and kicked egg breakage remain separate fragile-preflight slices.
