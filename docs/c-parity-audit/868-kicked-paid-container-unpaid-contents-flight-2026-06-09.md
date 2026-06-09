# Kicked Paid Container With Unpaid Contents Flight

## C anchors

- `nethack-c/upstream/src/dokick.c:493` and `nethack-c/upstream/src/dokick.c:507` select the top floor object and route it into `really_kick_object()`.
- `nethack-c/upstream/src/dokick.c:607` computes `costly` from the source shop and top-level `kickedobj->unpaid`; unpaid contents alone do not affect that source test.
- `nethack-c/upstream/src/dokick.c:649` enters the box/chest preflight impact branch.
- `nethack-c/upstream/src/dokick.c:653` calls `container_impact_dmg()` before lock or lid RNG.
- `nethack-c/upstream/src/dokick.c:656` through `:670` return early only when the lock breaks or the lid slams.
- `nethack-c/upstream/src/dokick.c:673` lets a box with failed local impact rolls and range at least two fall through into ordinary flight.
- `nethack-c/upstream/src/dokick.c:721` leaves the old preflight `addtobill()` block disabled.
- `nethack-c/upstream/src/dokick.c:733` extracts the object and launches normal same-level flight with `bhit(..., KICKED_WEAPON, ...)`.
- `nethack-c/upstream/src/dokick.c:760` detects a landing outside the source shop or in a different shop room.
- `nethack-c/upstream/src/dokick.c:766` calls `stolen_value(obj, sourceX, sourceY, shkp->mpeaceful, FALSE)` for non-gold objects before floor effects.
- `nethack-c/upstream/src/dokick.c:771` runs `flooreffects()` after any leaving-shop `stolen_value()` charge.
- `nethack-c/upstream/src/dokick.c:777` calls recursive `subfrombill()` on same-shop landing only when the top-level object itself is `unpaid`.
- `nethack-c/upstream/src/shk.c:3737` lets `stolen_container()` remove contained live bill rows with `sub_one_frombill()`.
- `nethack-c/upstream/src/shk.c:3781` removes a top-level live bill row when present.
- `nethack-c/upstream/src/shk.c:3818` charges peaceful shopkeepers into `debit` and angry/non-peaceful handling into `robbed`.
- `nethack-c/upstream/src/shk.c:3845` formats paid-container-with-unpaid-contents debt as `for its contents` or `for some of its contents`, even when the top container value is included.

## JS parity

- `js/cmd.js` now lets paid containers with unpaid contents pass the command-kick support guard.
- Boxes whose local lock/lid impact roll does not stop the command now continue into ordinary same-level flight even when no down-gate is involved.
- Same-shop paid-container landings do not return contained bill rows; contained unpaid objects remain unpaid and on the live bill.
- Leaving-shop landings with recursive unpaid state now use a kick-specific `stolen_value`-style helper: top shop-floor value is included when chargeable, contained bill rows are removed, and the resulting value is charged before floor effects.
- The leaving-shop message uses the C contents suffix when the recursive bill rows are for contents of a paid container.

## Canaries

- `command kicked paid box with unpaid contents same-shop flight preserves bill row` covers a paid box flying within the same shop after the lid roll fails; the contained dagger bill row remains live.
- `command kicked paid box with unpaid contents leaving shop charges box and contents` covers box value plus contained bill row conversion, with `for its contents!` wording.
- `command kicked paid sack with unpaid contents leaving shop charges container and contents` covers the non-box container path without box impact RNG.

## Remaining follow-up

- Top-level unpaid containers with contents and the same-level box preflight content-impact canary are covered by audit 869.
- Obstruction/door "comes loose" kicks have a separate active `addtobill()` path and remain outside this slice.

## Verification

- `node --test --test-name-pattern "command kicked paid box with unpaid contents|command kicked paid sack with unpaid contents|command kicked unpaid floor object|command kicked shop-floor ordinary object|command kicked no-charge shop-floor ordinary object|command kicked box no-drop" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)
