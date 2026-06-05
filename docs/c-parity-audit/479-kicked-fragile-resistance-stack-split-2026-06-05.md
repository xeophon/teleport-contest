# C Parity Audit 479: Kicked Fragile Resistance Stack Split

Implemented the kicked fragile-object resistance continuation for stack handling and `oartifact` resistance. The slice covers a fragile floor stack that survives the preflight `breaktest()` roll, keeps its remainder at the source square, and sends only one split item into ordinary kicked-object ladder shipping. It also routes break-resistance artifact checks through both JS artifact fields so `oartifact` follows C's `obj->oartifact` resistance path. No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:610` through `:613`: kicking a floor object prints `You kick ...` before fragile break handling.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: kicked fragile objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return only when it breaks.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` returns `0` immediately when `breaktest()` says the object did not break; there is no break message or `breakobj()` side effect.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2593`: `breaktest()` calls `obj_resists(obj, 1, 99)` before classifying fragile materials and object types.
- `nethack-c/upstream/src/zap.c:1458` through `:1471`: `obj_resists()` consumes `rn2(100)` for ordinary objects and uses `obj->oartifact ? achance : ochance`.
- `nethack-c/upstream/src/dokick.c:686` through `:695`: after a non-breaking fragile preflight, low range is handled first, then non-gold stacks split one object for flight.
- `nethack-c/upstream/src/dokick.c:717` through `:739`: the post-split kicked object is extracted and sent into `bhit()` flight.
- `nethack-c/upstream/src/dokick.c:742` through `:789`: the surviving kicked object then follows normal monster hit, migration/hole, floor-effect, shop, placement, and stacking handling.

## JS Changes

- `js/cmd.js`
  - Adds `objectHasArtifactIdentity()` and uses it for top-level impact drop, projectile content breakage, and projectile top-level break resistance checks.
  - Changes `kickFloorObjectToward()` to allow replacing the selected floor stack with the split projectile unit after preflight resistance.
  - Adds `splitKickedFloorObjectForFlight()` so a resisted fragile stack leaves `quan - 1` at the original square and sends only one object onward.

## Tests

- `command kicked fragile stack resistance splits one item before ladder flight`
  - Kicks a stack of three known confusion potions with the first fragile preflight roll resisting.
  - Asserts the source stack remains at the original square with quantity two.
  - Asserts no source shatter, vapor, confusion, thump, hit, or miss occurs, and the split item proceeds into ladder shipping.
- `command kicked oartifact fragile object uses artifact resistance before ladder flight`
  - Kicks an `oartifact` looking glass with ordinary break rolls that would break a non-artifact.
  - Asserts both preflight and ladder-shipping break checks use artifact resistance, no break/luck/muffled messages occur, and the object is queued with `MIGR_LADDER_UP`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked (fragile stack resistance|oartifact fragile object|confusion potion|unlit oil|lit oil|expensive camera|fertile egg stack|pyrolisk egg|glass wand|mirror|crystal ball)" test/shop-billing-helpers.test.mjs` - pass, 10 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1766 tests
- `node --test` - pass, 1917 tests
- `node --test test/*.mjs` - pass, 1917 tests
- `npm run score` - pass, 44/44 sessions
- `git diff --check` - pass

## Remaining

- Shop-owned kicked fragile break billing remains separate from this non-shop slice.
- Low-range resisted fragile `Thump!` return-roll coverage remains open.
- Broader unsupported kicked fragile classes such as melon, venom, and generic glass remain separate from the currently supported preflight candidates.
