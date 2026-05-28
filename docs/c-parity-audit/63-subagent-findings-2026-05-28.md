# Statue Shatter Owner Billing

## Scope

Parallel read-only audits compared statue-trap shatter animation with shared shop ownership and nearby `sellobj()` follow-ups. The implemented slice covers a shop-floor statue trap whose statue already belongs to another shopkeeper's bill.

## C Anchors

- `activate_statue_trap()` deletes the trap and calls `animate_statue(..., ANIMATE_SHATTER, ...)` for shatter attempts at `nethack-c/upstream/src/trap.c:923`.
- `animate_statue()` documents the required order: print the animation message, run shop debt, transfer statue contents, then delete the statue at `nethack-c/upstream/src/trap.c:713`.
- Hero-caused non-normal animation charges only costly, non-`no_charge` floor statues, and skips the animated shopkeeper itself at `nethack-c/upstream/src/trap.c:854`.
- The charge happens through `stolen_value(statue, x, y, shkp->mpeaceful, FALSE)` before contents move to the monster at `nethack-c/upstream/src/trap.c:867` and `nethack-c/upstream/src/trap.c:880`.
- `stolen_value()` resolves the object owner through `find_objowner()` before pricing and removing live bill rows at `nethack-c/upstream/src/shk.c:1082` and `nethack-c/upstream/src/shk.c:3768`.

## JS Status

- `activateStatueTrap()` already had the correct timing: it calls `statueShatterShopDebtMessage()` before `moveStatueContentsToMonster()`.
- `statueShatterShopDebtMessage()` now uses `lostShopMerchandiseChargesForObject()` instead of the single-shopkeeper value helper.
- The message names the sole owning shopkeeper when there is one owner, preserving the existing same-shop wording while fixing owner-billed statue rows on shared or adjacent shop setups.
- The source shopkeeper's peaceful context is still used for C-shaped debit/robbed routing, matching the C caller's `shkp->mpeaceful` argument.

## Tests

Focused public coverage in `test/shop-billing-helpers.test.mjs` now checks:

- Existing shatter timing still charges contents before animation inventory transfer.
- A shattering statue trap with the statue itself already on another live shop bill removes that owner's bill row and debits that owner, not the square's shopkeeper.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "statue trap" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`

## Remaining Work

- Ordinary drop `sellobj()`/recursive `subfrombill()` still selects by square first. The next compact shared-shop slice is owner-aware return/sale handling for dropped unpaid non-containers and dropped containers.
- Forced chest non-potion material wording remains independent of statue billing. `chest_shatter_msg()` should use C material wording for wax, veggie, flesh, glass, wood, and default objects.
- Broader `stolen_value()` parity still has edge cases around multi-owner contained values and credit/message formatting, but the common one-owner statue-shatter path now follows the shared owner lookup.
