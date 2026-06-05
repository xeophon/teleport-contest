# C Parity Audit 481: Kicked Shop Fragile Break Billing

Implemented shop-owned kicked fragile floor-object billing for the existing kicked `hero_breaks()` preflight path. The slice keeps the C ordering: the kick message and fragile break side effects happen before floor removal and before any projectile flight, while ordinary shop-floor stock on a costly spot is charged as lost merchandise rather than converted into a used-up bill row. No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:610` through `:613`: kicking a floor object prints `You kick ...` before fragile handling.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: kicked fragile floor objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return immediately when it breaks.
- `nethack-c/upstream/src/dokick.c:692` through `:695`: non-gold stack splitting only happens after the fragile preflight break/resistance branch.
- `nethack-c/upstream/src/dothrow.c:2428` through `:2435`: `hero_breaks()` prints the break message before routing the object to `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:2542` through `:2569`: hero-caused breakage charges shop objects through `check_shop_obj()` or costly-spot `stolen_value()` before deleting the object.
- `nethack-c/upstream/src/shk.c:3818` through `:3855`: peaceful shop-floor merchandise broken inside the shop adds debit and prints `You owe <shopkeeper> <amount> zorkmids for it!`.

## JS Changes

- `js/cmd.js`
  - Lets shop-owned or unpaid floor objects enter `kickFloorObjectToward()` only when they are already classified as kicked fragile preflight break candidates.
  - Adds `chargeHeroBrokenShopFloorObject()` to share the existing unpaid-debt and lost-merchandise helpers from the fragile break path.
  - Calls shop billing after break side effects and before `removeFloorObject()`, preserving the C ordering and avoiding remote-hole projectile shipment for objects that broke.

## Tests

- `command kicked shop-floor cream pie break charges before remote projectile flight`
  - Places a saleable cream pie on a costly shop square in front of a seen remote hole.
  - Asserts the object breaks locally with `What a mess!`, prints the shop debit message, increments `shkp.debit`, creates no live or used-up bill row, and does not queue remote impact-drop migration.
  - Pins the break RNG to the single preflight `rn2(100)` roll.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked shop-floor cream pie break charges before remote projectile flight" test/shop-billing-helpers.test.mjs` - pass, 1 matching test
- `node --test --test-name-pattern "command kicked .*break|command kicked shop-floor cream pie break charges|shop-floor object falls through remote shaft charges" test/shop-billing-helpers.test.mjs` - pass, 9 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1771 tests
- `node --test` - pass, 1922 tests
- `node --test test/*.mjs` - pass, 1922 tests
- `npm run score` - pass, 44/44

## Remaining

- Low-range resisted fragile `Thump!`/`kick_ouch` return-roll coverage is covered in audit 482.
- Glass armor kicked preflight remains separate because C crack-erodes it before destruction.
- Generic local venom placeholders remain excluded unless resolved to concrete acid/blinding venom.
