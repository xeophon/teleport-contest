# Force-Destroyed Shop Box Owner Billing

## Scope

Parallel read-only audits compared upstream `#force` box destruction, generic shop object ownership, and `sellobj()`/`subfrombill()` routing with the JS shop helpers. The implemented slice covers destroyed shop-floor boxes whose shattered contents already belong to a different shopkeeper's bill.

## C Anchors

- `breakchestlock()` handles `#force` box destruction in `nethack-c/upstream/src/lock.c:173`.
- Destroyed contents are extracted one by one, and potions or one-in-three other contents shatter at `nethack-c/upstream/src/lock.c:184`.
- Each shattered content object is charged with `stolen_value(otmp, u.ux, u.uy, peaceful_shk, TRUE)` before `obfree()`/`useup()` removes it at `nethack-c/upstream/src/lock.c:189`.
- The destroyed box itself is charged through `stolen_value(box, u.ux, u.uy, peaceful_shk, TRUE)` at `nethack-c/upstream/src/lock.c:206`.
- `stolen_value()` resolves the object owner with `find_objowner()` before falling back to the current shop room in `nethack-c/upstream/src/shk.c:3754` and `nethack-c/upstream/src/shk.c:1082`.

## JS Status

- `recordBreakChestShopLoss()` now uses `lostShopMerchandiseChargesForObject()` instead of the older single-shopkeeper value helper.
- The forced-box destruction context keeps a per-owner charge map until all delayed content shatter messages have been processed, then charges each owning shopkeeper while preserving C's single `peaceful_shk` context from the source shop.
- Existing single-shop behavior is unchanged: the final aggregate message still reports one total "objects destroyed" debt after all content messages.
- The regression creates a destroyed shop-floor box in one shop with a no-charge potion already on another shopkeeper's bill. The shattered potion now debits its bill owner, removes that bill row, and the box itself still debits the source shopkeeper.

## Tests

Focused public coverage in `test/shop-billing-helpers.test.mjs` now checks:

- A destroyed shop-floor box still charges shattered contents plus the box as one aggregate loss.
- A destroyed shop-floor box charges billed shattered contents to the shopkeeper who owns the bill row, even when the destroyed box is in another shop.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "destroyed shop-floor box" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`

## Remaining Work

- `statueShatterShopDebtMessage()` still uses the single-shopkeeper `lostShopMerchandiseValueForObject()` path; it is the next compact caller to convert to owner-aware charge maps.
- Ordinary carried-drop `sellobj()`/`subfrombill()` routing still selects by square first. Shared-shop bill-owner return should route through `findShopObjectOwnerAt()`/owner-aware helpers.
- Forced-box message parity is still incomplete for non-potion material wording from `chest_shatter_msg()`; wax, glass, wood, flesh, and default destruction messages remain a separate UI slice.
