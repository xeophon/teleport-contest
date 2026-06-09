# Kicked Obstructed Object Comes Loose

## C anchors

- `nethack-c/upstream/src/dokick.c:1393` through `:1465` dispatch object kicks before door kicks, so an object on a closed door uses `kick_object()` instead of `kick_door()`.
- `nethack-c/upstream/src/dokick.c:607` snapshots the source shop owner and costly state before the loose-object branch.
- `nethack-c/upstream/src/dokick.c:610` emits `You kick <object>.` before the loose/failure message.
- `nethack-c/upstream/src/dokick.c:615` enters the special branch when the source square is obstructed or a closed door.
- `nethack-c/upstream/src/dokick.c:616` through `:624` leaves the object in place on a failed dexterity check, then returns `!rn2(3) || martial()` so the caller may still apply kick ouch.
- `nethack-c/upstream/src/dokick.c:626` through `:641` removes the object from the source square, optionally calls active `addtobill()`, runs floor effects at the hero square, then places/stacks the object there.
- `nethack-c/upstream/src/dokick.c:633` uses active pickup-style billing for objects leaving the source shop, while `no_charge` objects simply clear `no_charge`.
- `nethack-c/upstream/src/shk.c:3552` through `:3562` prints the pickup-style `will cost` message for live bill rows.

## JS parity

- `js/cmd.js` now detects floor objects whose source square is obstructed or a closed door before ordinary projectile/monster-impact flight.
- The branch preserves C message order: `You kick ...`, then `The ... comes loose.` or `The ... doesn't come loose.`
- Success extracts the source object, redraws the source square, applies pickup-style live shop billing if the object leaves the source shop, and places the object on the hero square through existing floor-effects/stacking helpers.
- `no_charge` objects kicked loose out of the shop clear `no_charge` without creating debt or a live bill row.
- Same-shop loose placement does not add a bill and does not use the normal kicked-flight `stolen_value()` debt path.
- Failed loose rolls leave the object and bill state unchanged, consume the C-shaped trailing `rn2(3)`, and keep the command turn handled rather than falling through to door kicking.

## Canaries

- `command kicked shop object on closed door comes loose to hero and gets live bill` covers object-before-door dispatch, hero-square placement, unchanged door terrain, and live `addObjectToShopBill()` billing.
- `command kicked no-charge shop object on closed door clears no-charge without billing` covers the C `no_charge` cleanup path.
- `command kicked same-shop object on closed door comes loose without billing` covers same-source-shop non-billing.
- `command kicked shop object on closed door failed loose roll leaves object and bill unchanged` covers failure state, RNG shape, and no fall-through to door damage.

## Remaining follow-up

- Recursive `addtobill()` coverage for containers, contained gold, and top-level gold is covered in audit `871`; full-bill and `costly_adjacent()` loose-source edges are covered in audit `872`.
- Obstructed non-door terrain has the same source-square branch and should get a dedicated canary if a later slice touches terrain-object creation or wall/object placement edge cases.
- The failure ouch tail reuses JS's existing kick-ouch damage helper; deeper C parity could split a stricter kick-object ouch helper if RNG-perfect failure damage becomes needed.

## Verification

- `node --test --test-name-pattern 'command kicked.*closed door|command kicked shop-floor ordinary object same-shop flight does not bill|command kicked shop-floor ordinary object leaving shop charges normal flight|command kicked no-charge shop-floor ordinary object leaving shop clears no-charge without debt' test/shop-billing-helpers.test.mjs` (`7` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`2963/2963` passing)
- `npm run score` (`44/44` passing)
