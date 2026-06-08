# Kicked Unpaid Floor Object Same-Level Flight

## C anchors

- `nethack-c/upstream/src/dokick.c:493` chooses the top floor object from the kicked square.
- `nethack-c/upstream/src/dokick.c:607` captures shop ownership and costly-source state before normal kicked-object flight.
- `nethack-c/upstream/src/dokick.c:721` keeps the old preflight `addtobill()` block disabled; ordinary moving kicks bill on landing.
- `nethack-c/upstream/src/dokick.c:733` extracts the object and launches it through `bhit(..., KICKED_WEAPON, ...)`.
- `nethack-c/upstream/src/dokick.c:752` returns after down-gate migration because `ship_object()` has already handled shop billing.
- `nethack-c/upstream/src/dokick.c:760` detects a normal landing outside the source shop or in a different shop room.
- `nethack-c/upstream/src/dokick.c:766` calls `stolen_value()` for a non-gold object kicked out of the source shop, before floor effects.
- `nethack-c/upstream/src/dokick.c:771` runs `flooreffects()` for surviving same-level normal flight.
- `nethack-c/upstream/src/dokick.c:777` removes a same-shop bill row only for a top-level `unpaid` object, after floor effects decline.
- `nethack-c/upstream/src/dokick.c:785` places, stacks, and redraws the surviving kicked object.
- `nethack-c/upstream/src/shk.c:3669` clears top-level `unpaid` state in `sub_one_frombill()`.
- `nethack-c/upstream/src/shk.c:3682` removes the matching live bill row when the full billed quantity returns.
- `nethack-c/upstream/src/shk.c:3781` lets `stolen_value()` remove the live unpaid bill row before charging debt.
- `nethack-c/upstream/src/shk.c:3818` charges the removed row into debit for a peaceful shopkeeper or robbed value otherwise.

## JS parity

- `js/cmd.js` now allows content-free top-level unpaid floor objects through the same-level command-kick support guard.
- The guard still rejects objects whose billing state only comes from contents, and rejects unpaid kicked objects with contents, keeping container billing outside this slice.
- Same-shop normal flight now calls the top-level bill-return helper after `earthFloorEffects()` declines and before placement/stacking.
- Leaving-shop normal flight continues to use the existing kick-specific debt path before placement; for unpaid objects that removes the live bill row and charges debit/robbed value before any floor-effect landing work.
- Gold remains excluded from the same-shop unpaid-object return helper and keeps its separate kicked-gold billing logic.

## Canaries

- `command kicked unpaid floor object same-shop flight removes bill row` covers a real unpaid dagger bill row flying across the same shop: it lands, clears `unpaid`, removes the bill row, and creates no debit, loan, or robbed value.
- `command kicked unpaid floor object leaving shop converts bill row to debt` covers the same unpaid dagger leaving the shop: it lands outside, clears the bill row, and charges the row price into `debit` with the C-style `for it!` message.
- `command kicked box with unpaid contents remains unsupported` documents this slice boundary so paid/top-level container content billing does not silently enter the ordinary object path.

## Remaining follow-up

- Paid boxes/containers with unpaid contents still need a command-level same-shop/leaving-shop audit because C distinguishes top-level `unpaid` from recursive `is_unpaid(container)`.
- Obstruction/door "comes loose" kicks have a separate active `addtobill()` path and remain outside this slice.
- Unpaid same-shop stacking interactions could use deeper canaries if future work starts changing floor-stack bill merging around kicked landings.

## Verification

- `node --test --test-name-pattern "command kicked unpaid floor object|command kicked box with unpaid contents|command kicked shop-floor ordinary object|command kicked no-charge shop-floor ordinary object" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)
