# Kicked Loose Container And Gold Billing

## C anchors

- `nethack-c/upstream/src/dokick.c:631` extracts the loose object and redraws the source before shop billing.
- `nethack-c/upstream/src/dokick.c:633` through `:637` uses `addtobill(obj, FALSE, FALSE, FALSE)` for non-`no_charge` objects kicked loose out of the source shop; `no_charge` objects clear the flag instead.
- `nethack-c/upstream/src/shk.c:3504` sends top-level gold objects through `costly_gold()` and creates no live bill row.
- `nethack-c/upstream/src/shk.c:3507` returns early with `You got that for free!` when a non-gold top-level bill is full, before inspecting container contents or gold.
- `nethack-c/upstream/src/shk.c:3527` through `:3534` recursively prices and bills non-gold container contents, then clears recursive `no_charge` state with `picked_container()`.
- `nethack-c/upstream/src/shk.c:3538` charges contained gold through `costly_gold()` before the final floor-pickup price quote at `shk.c:3552`.

## JS parity

- `js/cmd.js` now lets the closed-door/obstructed loose branch bypass the ordinary kicked-flight support guard, while still excluding boulders, the iron ball, and the chain.
- Top-level shop gold kicked loose out of the shop uses the source shopkeeper's active gold debt/credit path and creates no bill row.
- Containers kicked loose out of the shop use a loose-specific recursive billing helper:
  - bills the top container if chargeable;
  - recursively preserves or creates live non-gold content bill rows;
  - charges contained gold through the source shopkeeper after source extraction;
  - clears recursive `no_charge` state;
  - emits contained-gold credit/debt messages before the single top-container `will cost` quote.
- Same-shop loose placement still skips billing entirely.

## Canaries

- `command kicked paid container on closed door comes loose and bills top plus contents live` covers paid container + already-unpaid content rows becoming live bill rows outside the shop, without converting to lost-goods debt.
- `command kicked paid container with gold on closed door comes loose and charges contained gold` covers paid containers that ordinary kicked flight would not support, active contained-gold debt, and message ordering before the top quote.
- `command kicked shop gold on closed door comes loose and charges gold debt` covers top-level gold active billing with no live bill row.

## Remaining follow-up

- A full-bill loose-container canary should pin the C early return before contained gold or contents are inspected.
- `costly_adjacent()` ownership for unpaid objects kicked loose from shared/adjacent shop squares remains broader than this source-room slice.
- Obstructed non-door terrain should get a dedicated canary if terrain-object placement or source-square support changes again.

## Verification

- `node --test --test-name-pattern 'command kicked.*closed door' test/shop-billing-helpers.test.mjs` (`7` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`2966/2966` tests passed)
- `npm run score` (`44/44` replay sessions passing)
