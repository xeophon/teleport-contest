# Kicked Shop-Floor Same-Level Flight

## C anchors

- `nethack-c/upstream/src/dokick.c:493` chooses the top floor object from the kicked square.
- `nethack-c/upstream/src/dokick.c:607` computes shop ownership for the kicked object before ordinary flight.
- `nethack-c/upstream/src/dokick.c:721` keeps the old preflight `addtobill()` block disabled; normal moving kicks bill after `bhit()`.
- `nethack-c/upstream/src/dokick.c:733` launches moving floor objects through `bhit(..., KICKED_WEAPON, ...)`.
- `nethack-c/upstream/src/dokick.c:760` checks whether the normal landing square is outside or in a different shop room.
- `nethack-c/upstream/src/dokick.c:763` calls `stolen_value()` for non-gold shop merchandise kicked out of the source shop.
- `nethack-c/upstream/src/dokick.c:771` runs `flooreffects()` before same-shop cleanup and placement.
- `nethack-c/upstream/src/dokick.c:777` only removes a same-shop bill row for a top-level unpaid object.
- `nethack-c/upstream/src/dokick.c:785` places the surviving kicked object after the shop tail.
- `nethack-c/upstream/src/shk.c:3475` lets the shop `billable()` path clear stale `no_charge` without debt when merchandise leaves the shop.

## JS parity

- `js/cmd.js` no longer rejects paid non-gold shop-floor objects from same-level command kicks outside the remote-gate path.
- Same-shop paid merchandise now flies normally without creating debit, loan, robbed value, or bill rows.
- Paid shop-floor merchandise kicked out of the shop now uses the existing normal-flight debt helper.
- No-charge shop-floor merchandise kicked out of the shop now clears `no_charge` without debt, matching C's `stolen_value()`/placement cleanup.
- Removed the stale `shopFloorGate` support-guard option after the guard stopped depending on the next square being a down-gate.

## Remaining follow-up

- Top-level unpaid command-kicked floor objects still stop at the support guard; C lets them fly and then removes same-shop bill rows or converts leaving-shop rows to debt.
- Paid boxes/containers with unpaid contents still need a command-level same-shop/leaving-shop audit because C distinguishes top-level `unpaid` from `is_unpaid(container)`.
- Obstruction/door "comes loose" kicks have a separate active `addtobill()` path and remain outside this slice.

## Verification

- `node --test --test-name-pattern "command kicked shop-floor ordinary object|command kick ordinary floor object flies|command kicked no-charge shop-floor ordinary object|command kicked shop-floor single gold piece leaving shop|command kicked shop-floor small gold stack rare" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)
