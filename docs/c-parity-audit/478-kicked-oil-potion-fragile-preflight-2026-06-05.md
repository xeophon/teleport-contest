# C Parity Audit 478: Kicked Oil Potion Fragile Preflight

Implemented the kicked floor-object fragile preflight branch for non-shop potions of oil. The slice covers unlit oil shatter and adjacent vapor handling, plus lit oil shatter and burning-oil explosion at the original kicked object square, before stack splitting or remote-hole projectile migration. It does not rely on replay maps, private seeds, player names, move counts, or fixture-specific runtime branches.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:610` through `:613`: kicking a floor object prints `You kick ...` before fragile-object handling.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: kicked fragile objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return immediately when breakage succeeds.
- `nethack-c/upstream/src/dokick.c:682` through `:694`: range handling and stack splitting only happen after the fragile preflight branch does not break.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` runs `breaktest()`, emits `breakmsg()`, then calls `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:2498` through `:2518`: all potions enter the potion break branch; lit oil calls `explode_oil()`, while unlit adjacent oil gets the generic vapor prelude and `potionbreathe()`.
- `nethack-c/upstream/src/dothrow.c:2569` through `:2572`: non-fracture objects are deleted after break side effects.
- `nethack-c/upstream/src/dothrow.c:2581` through `:2605`: `breaktest()` gives ordinary potions the 1% object-resistance continuation.
- `nethack-c/upstream/src/dothrow.c:2611` through `:2638`: potion breakage prints the ordinary shatter message.
- `nethack-c/upstream/src/explode.c:961` through `:968`: burning oil splatters as a regular fiery explosion with `d(3,4)` diluted or `d(4,4)` ordinary damage.
- `nethack-c/upstream/src/explode.c:971` through `:982`: `explode_oil()` ends the light source, marks the object as exploding, then splatters burning oil.
- `nethack-c/upstream/src/potion.c:1930` through `:2110`: `potionbreathe()` has no active `POT_OIL` case beyond the naming/call opportunity.

## JS Changes

- `js/cmd.js`
  - Allows oil potions through `kickedFragilePreflightBreakKind()`.
  - Keeps the existing `brokenPotionBreathe()` path for unlit oil and other potions.
  - Routes lit oil through `explodeBurningOilPotion(obj, x, y, messages)` at the original kicked floor square before object removal.

## Tests

- `command kicked unlit oil potion shatters and breathes before remote projectile flight`
  - Kicks an identified unlit oil potion toward a seen remote hole.
  - Asserts the potion shatters at the source square, emits the generic adjacent odor, is removed, and is not queued for remote impact drop.
  - Asserts no burning-oil, hole, thump, hit, miss, or muffled messages occur, and only the `rn2(100)` break-resistance roll is consumed.
- `command kicked lit oil potion shatters and explodes before remote projectile flight`
  - Kicks a lit oil potion toward a seen remote hole.
  - Asserts shatter then `Boom!` and hero burning-oil damage at the source square, with no odor or remote-flight messages.
  - Asserts the RNG prefix is `rn2(100)`, `d(4,4)`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked (unlit oil|lit oil|confusion potion|expensive camera|fertile egg stack|pyrolisk egg|cream pie|glass wand|mirror|lenses|fragile crystal ball)" test/shop-billing-helpers.test.mjs` - pass, 11 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1764 tests
- `node --test` - pass, 1915 tests
- `node --test test/*.mjs` - pass, 1915 tests
- `npm run score` - pass, 44/44 replay sessions

## Remaining

- Shop-owned kicked fragile break billing remains separate from this non-shop slice.
- The 1% resistance continuation should keep oil alive and continue into ordinary kick flight/hole handling; broader pass-through coverage remains open.
- Broader burning-oil terrain edges remain covered only where existing direct-hit burning-oil tests already model them.
