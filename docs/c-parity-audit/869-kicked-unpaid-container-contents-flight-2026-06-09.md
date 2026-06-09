# Kicked Unpaid Container Contents Flight

## C anchors

- `nethack-c/upstream/src/dokick.c:607` captures the source shop and costly state before normal kicked-object flight.
- `nethack-c/upstream/src/dokick.c:733` extracts the kicked object before flight, so leaving-shop handling sees it as a free floor object.
- `nethack-c/upstream/src/dokick.c:760` detects a normal landing outside the source shop or into a different shop.
- `nethack-c/upstream/src/dokick.c:766` calls `stolen_value(obj, sourceX, sourceY, shkp->mpeaceful, FALSE)` before floor effects for a non-gold object kicked out of the source shop.
- `nethack-c/upstream/src/dokick.c:771` runs `flooreffects()` before same-shop bill return.
- `nethack-c/upstream/src/dokick.c:777` calls recursive `subfrombill()` only when the top-level kicked object itself is `unpaid`.
- `nethack-c/upstream/src/dokick.c:781` donates contained gold after same-shop `subfrombill()`.
- `nethack-c/upstream/src/shk.c:3694` recurses through non-gold contents in `subfrombill()`.
- `nethack-c/upstream/src/shk.c:3754` through `:3781` removes live bill rows during `stolen_value()`.
- `nethack-c/upstream/src/shk.c:3803` skips contained gold for normal leaving-shop kicked flight because the kicked object is not inventory-like.
- `nethack-c/upstream/src/shk.c:3845` distinguishes `for it and its contents` from `for it and some of its contents`.
- `nethack-c/upstream/src/shk.c:3877` lets donated contained gold pay debt/loan or re-establish credit.

## JS parity

- `js/cmd.js` now lets top-level unpaid containers with contents pass the command-kick support guard.
- Same-shop normal flight uses a kick-specific return path gated on `obj.unpaid`; paid containers with unpaid contents still keep contained bill rows live in the same shop.
- The same-shop return path calls recursive `subFromShopBill()` and donates contained gold with the non-selling credit wording.
- Leaving-shop normal flight excludes contained gold from the recursive stolen-value charge and still removes top/content bill rows.
- Debt suffix counting now includes contained gold, so unpaid bill rows plus uncharged gold produce `some of its contents`.

## Canaries

- `command kicked paid box breaks unpaid fragile contents before same-shop flight` pins box preflight content impact before same-level flight without a down-gate.
- `command kicked top-level unpaid box with unpaid contents same-shop flight returns bill rows` covers recursive same-shop bill return for a top-level unpaid box.
- `command kicked top-level unpaid sack same-shop returns bills and donates contained gold` covers recursive return plus contained-gold credit donation.
- `command kicked top-level unpaid sack with gold leaving shop charges some contents only` covers leaving-shop debt excluding contained gold and the C suffix wording.

## Remaining follow-up

- Obstruction/door "comes loose" kicks have a separate active `addtobill()` path and remain outside this slice.
- Broader same-shop stacking interactions after recursive bill return could use deeper canaries if floor-stack billing changes.

## Verification

- `node --test --test-name-pattern "command kicked (paid box breaks unpaid fragile contents before same-shop flight|top-level unpaid|paid box with unpaid contents|paid sack with unpaid contents|unpaid floor object)" test/shop-billing-helpers.test.mjs` (`9` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`2959/2959` passing)
- `npm run score` (`44/44` passing)
