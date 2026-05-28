# Magic-Bag Trigger Explosion Shop Billing

## Scope

Parallel read-only audits compared upstream magic-bag source/target explosion ordering with the JS container and tip helpers. The implemented slice covers the case where the object triggering a target magic-bag explosion is itself a bag of holding.

## C Anchors

- `do_boh_explosion()` explodes the trigger bag's own contents before the target bag is deleted at `nethack-c/upstream/src/pickup.c:2518`.
- `in_container()` runs `sellobj()` before shop-floor target magic-bag explosions at `nethack-c/upstream/src/pickup.c:2629`, re-adds unpaid trigger objects before `obfree()` at `nethack-c/upstream/src/pickup.c:2665`, and bills a shop-floor target bag before deleting it at `nethack-c/upstream/src/pickup.c:2673`.
- `tipcontainer()` bills shop-floor source contents with `addtobill()` before target insertion at `nethack-c/upstream/src/pickup.c:3770`.
- If the trigger object is a bag of holding, `tipcontainer()` runs `do_boh_explosion()` for the trigger first, then `obfree()`s it, then explodes the target at `nethack-c/upstream/src/pickup.c:3788`.
- Vanished trigger-bag contents go through `mbag_item_gone()`, which applies `stolen_value()` before `obfree()` at `nethack-c/upstream/src/pickup.c:2803`.
- The underlying bill-row behavior is `obfree()`, `addtobill()`, `subfrombill()`, and `stolen_value()` in `nethack-c/upstream/src/shk.c:1187`, `nethack-c/upstream/src/shk.c:3490`, `nethack-c/upstream/src/shk.c:3694`, and `nethack-c/upstream/src/shk.c:3754`.

## JS Status

- `explodeMagicBagTransfer()` now passes the trigger bag's C held/floor context into trigger-bag content scattering.
- `scatterMagicBagContents()` can bill vanished contents with explicit `do_boh_explosion()` context instead of inferring ownership from the already-extracted trigger bag.
- Shop-floor trigger bags tipped into carried magic bags now charge vanished trigger contents through the same owner-aware `stolen_value()`-style charge map and preserve the trigger bag itself as a used-up bill row.
- Carried trigger bags tipped into carried magic bags now charge vanished unpaid trigger contents while the hero is in a shop, matching the held `mbag_item_gone()` route.
- Existing target-bag destruction and target-content scatter billing remain on the prior target-bag path.

## Tests

Focused public coverage in `test/shop-billing-helpers.test.mjs` now checks:

- A shop-floor bag of holding tipped into a carried magic bag charges vanished trigger contents as debt, removes the vanished content bill row, and keeps the trigger bag as a used-up bill row.
- A carried bag of holding tipped into a carried magic bag charges vanished unpaid trigger contents and clears the live bill row.
- The prior nested cancellation-trigger case still preserves billed trigger trees as used-up rows.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "trigger contents|nested cancellation trigger|magic bag explosion" test/shop-billing-helpers.test.mjs`

## Remaining Work

Remaining shop-helper work should stay on compact C-backed callers: less ordinary projectile/container loss, generic `obfree()` preservation, broader `sellobj()` integration, and any magic-bag valuation cases not covered by the held/floor trigger-bag context.
