# C Parity Audit 476: Kicked Camera Fragile Preflight Demon

Implemented the kicked floor-object fragile preflight branch for non-shop expensive cameras. The slice covers camera shatter and picture-painting demon release at the original kicked object square before remote-hole projectile migration, without relying on replay maps, private seeds, player names, move counts, or fixture-specific runtime branches.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:612` through `:613`: kicking a floor object prints the `You kick ...` message before fragile-object handling.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: kicked fragile objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return before range, flight, and hole handling when breakage succeeds.
- `nethack-c/upstream/src/dokick.c:733`: the later `bhit(..., KICKED_WEAPON, ...)` movement path is only reached when fragile preflight breakage does not return.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` runs `breaktest()`, emits `breakmsg()`, then calls `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:2457` through `:2468`: `release_camera_demon()` has a one-in-three release gate, chooses homunculus versus imp with `rn2(3)`, emits the visible release message, and sets peacefulness from `!obj->cursed`.
- `nethack-c/upstream/src/dothrow.c:2522` through `:2524`: `breakobj()` dispatches expensive cameras to `release_camera_demon(obj, x, y)`, using the break coordinate passed by `hero_breaks()`.
- `nethack-c/upstream/src/dothrow.c:2542` through `:2567`: hero-caused floor-object breakage has shop cleanup after object-specific side effects; this slice stays non-shop because the current kicked floor-object support still excludes costly/unpaid objects.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2605`: `breaktest()` consumes the object-resistance roll and treats expensive cameras as breakable after the 1% non-artifact resistance chance.
- `nethack-c/upstream/src/dothrow.c:2626` through `:2638`: visible expensive camera breakage uses `shatters into a thousand pieces`.
- `nethack-c/upstream/src/zap.c:1458` through `:1469`: ordinary non-artifact object resistance consumes `rn2(100)` and resists only when the roll is below 1.
- `nethack-c/upstream/src/zap.c:4049` and `nethack-c/upstream/src/dokick.c:1639`: seen-hole shipping belongs to the later projectile movement route, so it is skipped on successful fragile preflight breakage.

## JS Changes

- `js/cmd.js`
  - Adds expensive cameras to `kickedFragilePreflightBreakKind()`.
  - Splits the fragile side-effect helper into a hero-caused helper plus the existing thrown wrapper, so kicked and thrown breakage share mirror luck and camera demon release without a thrown-specific call site.
  - Makes `breakKickedFragileFloorObject()` and `kickFloorObjectToward()` async, then awaits the kicked floor-object helper from the command handler.
  - Calls camera release with the original floor-object coordinates, preserving C's `breakobj(obj, x, y, ...)` placement coordinate.

## Tests

- `command kicked expensive camera breaks before remote projectile flight and releases demon`
  - Kicks an adjacent visible expensive camera toward a seen remote hole.
  - Asserts the camera is removed at its original square and is not queued to the remote level.
  - Asserts `You kick an expensive camera.`, `An expensive camera shatters into a thousand pieces!`, and `The picture-painting demon is released!`.
  - Asserts no `falls through the hole`, `Thump`, hit, miss, or muffled remote-flight wording appears.
  - Asserts a peaceful homunculus appears at `(6,5)`.
  - Asserts the RNG label prefix is exactly `rn2(100)`, `rn2(3)`, then `rn2(3)`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked (expensive camera|confusion potion|cream pie|glass wand|mirror|lenses|fragile crystal ball)" test/shop-billing-helpers.test.mjs` - pass, 7 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1760/1760
- `node --test` - pass, 1911/1911
- `node --test test/*.mjs` - pass, 1911/1911
- `npm run score` - pass, 44/44

## Remaining

- Shop-owned kicked expensive camera break billing remains separate from this non-shop slice.
- Kicked cursed camera hostile imp release remains a useful focused follow-up around the same branch.
- The 1% resistance continuation should keep the camera alive and continue into flight/hole handling; broader pass-through coverage remains open.
- Kicked egg breakage and oil explosion remain separate fragile-preflight slices.
