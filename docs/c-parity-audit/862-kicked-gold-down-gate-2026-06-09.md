# Kicked Gold Down-Gate Migration

## C anchors

- `nethack-c/upstream/src/dokick.c:692` keeps multi-coin stacks in the `rn2(20)` scatter branch before any intact kicked-object flight can reach a gate.
- `nethack-c/upstream/src/dokick.c:733` sends surviving intact kicked gold through `bhit()`.
- `nethack-c/upstream/src/zap.c:4049` lets kicked coins call `ship_object()` at an empty down-gate square, but stops coins before shipping if the gate square already has floor objects.
- `nethack-c/upstream/src/dokick.c:1657` makes ladders always drop ordinary objects, while stairs, special stairs, seen holes, and seen trapdoors consume `rn2(3)` and no-drop two thirds of the time.
- `nethack-c/upstream/src/dokick.c:1684` emits the visible transit message before shop billing.
- `nethack-c/upstream/src/dokick.c:1695` uses `stolen_value()` for successful migration billing, not `costly_gold()`.
- `nethack-c/upstream/src/dokick.c:752` returns early for `OBJ_MIGRATING`, so the later kicked-gold `costly_gold()` tail and `flooreffects()` are skipped after successful shipping.
- `nethack-c/upstream/src/dokick.c:1953` maps down stairs to `MIGR_STAIRS_UP` or `MIGR_SSTAIRS`.
- `nethack-c/upstream/src/dokick.c:1958` maps down ladders to `MIGR_LADDER_UP`.
- `nethack-c/upstream/src/dokick.c:1962` only maps holes and trapdoors when their trap is seen.
- `nethack-c/upstream/src/shk.c:3451` makes coins billable to a shopkeeper that cares about the gate square.
- `nethack-c/upstream/src/shk.c:3782` and `nethack-c/upstream/src/shk.c:3800` value billable stolen coins directly by `obj->quan`.

## JS parity

- `js/cmd.js` now allows billable gold through kicked-object down-gate detection and shipping by passing `allowGold` only from the kicked gold path.
- Successful kicked-gold migration queues the intact coin object on the target level and preserves stack quantity.
- Stair and seen-shaft migration consume the same `rn2(3)` drop roll before the `rn2(100)` break-test roll; ladder migration skips the `rn2(3)` roll.
- Kicked gold migration shop debt is now gate-square based, matching C's `ship_object(..., costly_spot(x,y))` call. A shop gate charges the gate shopkeeper even when the coin started outside; a non-shop gate does not charge just because the coin started on a shop floor.
- Successful migration skips the existing same-level kicked-gold `costly_gold()` style charge, so shop migration charges without adding the same-level loan.
- Thrown gold shipping remains unchanged: gold billing is still handled only in the kicked-object path, not by broadening `shipObjectShopDebt()`.

## Remaining follow-up

- C no-drop returns `FALSE` from `ship_object()` and lets kicked flight continue. The current JS no-drop fallback is the existing broader kicked-object behavior and can still place locally instead of continuing flight.
- C short-circuits kicked coins before shipping when the down-gate square already has another floor object. Existing coin pile stopping covers the basic behavior, but there is no dedicated occupied-down-gate RNG canary yet.

## Verification

- `node --test --test-name-pattern "command kick single gold piece|command kicked single gold piece|command kicked multi gold stack|command kicked shop-floor gold|command kicked small gold stack|command kicked shop-floor single gold piece down|command kicked outside single gold piece down|command kicked small multi gold stack|command kicked large multi gold stack" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`
