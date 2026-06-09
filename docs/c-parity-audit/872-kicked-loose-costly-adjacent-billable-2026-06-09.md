# Kicked Loose Costly Adjacent Billable

## C anchors

- `nethack-c/upstream/src/dokick.c:607` snapshots the source owner with `find_objowner(obj, x, y)`.
- `nethack-c/upstream/src/dokick.c:608` treats the source as costly if it is a true `costly_spot()`, or if it is `costly_adjacent(shkp, x, y)` and the top object is already `unpaid`.
- `nethack-c/upstream/src/dokick.c:633` through `:637` call `addtobill()` only after a successful loose event and only when the object leaves the source shop; top-level `no_charge` clears instead of billing.
- `nethack-c/upstream/src/shk.c:3469` through `:3472` make `billable()` reject objects already on the bill, so a loose unpaid edge object is not double-added or re-quoted.
- `nethack-c/upstream/src/shk.c:3507` returns early with `You got that for free!` when the top-level non-gold bill is full, before contents or contained gold are inspected.
- `nethack-c/upstream/src/shk.c:5369` through `:5380` define `costly_adjacent()` as a shop wall/door edge or the shopkeeper free spot.
- `nethack-c/upstream/src/shk.c:5754` through `:5755` make `costly_gold()` a strict `costly_spot()` path; mere `costly_adjacent()` does not charge gold.

## JS parity

- `js/cmd.js` now has a loose-source owner helper that separates strict costly spots from C-style adjacent shop edge/free-spot sources.
- Paid objects kicked loose from a shop-edge closed door no longer receive pickup-style billing just because the square has a shop room number.
- Already-unpaid objects kicked loose from a shop-edge closed door keep their existing live bill row without adding a duplicate row or printing a new `will cost` quote.
- Top-level `no_charge` is cleared before any loose `addtobill()`-style work, matching the C loose-branch gate.
- Contained or top-level gold is charged only for strict costly sources; adjacent-only sources can reach the loose gate for unpaid non-gold objects but do not use the active `costly_gold()` debt path.
- Full-bill loose containers return `You got that for free!` before top billing, content rows, contained gold, or the final price quote.

## Canaries

- `command kicked paid object on shop-edge closed door comes loose without costly-adjacent billing` covers the paid edge non-billing case.
- `command kicked unpaid object on shop-edge closed door comes loose with existing bill unchanged` covers `find_objowner()` plus `costly_adjacent(..., unpaid)` and `billable()` rejecting already-billed objects.
- `command kicked paid container on closed door with full bill comes loose for free before contents` covers the C full-bill early return before content and contained-gold inspection.

## Remaining follow-up

- Obstructed non-door terrain still deserves a direct command canary if terrain-object placement or source-square support is touched again.
- Shared walls involving multiple candidate shopkeepers remain broader than this single-owner shop-edge slice.

## Verification

- `node --test --test-name-pattern 'command kicked.*closed door' test/shop-billing-helpers.test.mjs` (`10` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`2969/2969` tests passed)
- `npm run score` (`44/44` replay sessions passing)
