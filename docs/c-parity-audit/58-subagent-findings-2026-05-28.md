# Boulder Push Shop-Boundary Billing

## Scope

Parallel read-only audits checked the C boulder push billing path and the matching JS movement/shop-ledger code. The implemented slice adds the C `dopush()` shop-boundary transitions for floor boulders without changing general pickup/use billing.

## C Anchors

- `moverock_core()` captures whether the boulder's source square is costly before movement at `nethack-c/upstream/src/hack.c:438`.
- `dopush()` moves the boulder, updates display, then adjusts shop billing at `nethack-c/upstream/src/hack.c:205` and `nethack-c/upstream/src/hack.c:216`.
- Pushing from a costly shop square to a non-costly boundary/free square calls `addtobill()` at `nethack-c/upstream/src/hack.c:220`.
- Pushing an unpaid boulder back into the owner shop calls `subfrombill()` at `nethack-c/upstream/src/hack.c:223`.
- Once the destination rooms no longer include the bill owner's shoproom, `dopush()` calls `stolen_value(otmp, sx, sy, TRUE, FALSE)` at `nethack-c/upstream/src/hack.c:235`.
- `inside_shop()` and `costly_spot()` are strict about shop interiors and shopkeeper presence at `nethack-c/upstream/src/shk.c:566` and `nethack-c/upstream/src/shk.c:5348`.
- Boulder object cost is zero in `objects.h`, but `get_cost()` floors zero prices to `5` before charisma/knowledge adjustment at `nethack-c/upstream/src/shk.c:2888`. The row is therefore a normal positive-price live bill row, not a zero-price marker.
- Shared/boundary owner lookup is handled by `find_objowner()` and `onshopbill()` at `nethack-c/upstream/src/shk.c:1082` and `nethack-c/upstream/src/shk.c:1160`.

## JS Status

- `js/cmd.js` now has a local C-shaped `shopRoomnosAt()`/`findShopObjectOwnerAt()` path for shop-boundary coordinate ownership.
- `shopkeeperForStrictCostlySpot()` keeps the boulder push transition aligned with C `costly_spot()`: strict shop interior, live resident in-shop, and not the shopkeeper's own square.
- `adjustBoulderPushShopBill()` runs after the boulder coordinates are updated, matching C's move-then-bill ordering.
- Pushing from a costly shop square to a non-costly square adds a positive boulder bill row using the C minimum base price and existing charisma adjustment shape.
- Pushing a billed boulder back into the owner shop removes the row silently through `subFromShopBill()`.
- Pushing a billed boulder along a shop boundary keeps the row while the destination rooms still include the owner shop, then converts it to ordinary debt when it becomes fully outside.
- `addObjectToShopBill()` remains strict about positive totals; the implementation did not weaken general billing to support marker rows.

## Tests

Focused public coverage in `test/shop-billing-helpers.test.mjs` now checks:

- A boulder pushed from a costly shop square moves first, then creates a live bill row and cost message.
- A billed boulder pushed back into its owner shop removes the row and clears `unpaid`.
- A billed boulder pushed along a shop boundary remains on the bill until pushed fully outside, where it becomes shop debt.
- A boulder billed to a second shopkeeper is removed from that second owner's bill when pushed into that shop.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "pushing .*boulder|boulder .*shop" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `npm run score` (`44/44`)

## Remaining Work

The next compact shop-ledger candidates are remaining magic-bag valuation/source/target cases, less ordinary projectile/container loss, shared `sellobj()` integration, generic `obfree()` preservation, broader costly-alteration paths, and remaining stone-to-flesh object rows. The next compact direct `potionhit()` families remain invisibility and acid.
