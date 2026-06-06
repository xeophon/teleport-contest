# Rolling Boulder Floor-Effect Used-Up Billing

Date: 2026-06-06

## Scope

Preserve an existing shop bill row when a monster-triggered rolling boulder is consumed by path floor effects.

This slice does not use replay maps, hidden tests, fixed seeds, player names, move-count branches, or fixture-specific runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3489` through `:3498` routes rolling boulders that reach `PIT`, `SPIKED_PIT`, `HOLE`, or `TRAPDOOR` through `flooreffects(singleobj, x2, y2, "fall")` and marks the launched object used up when that returns true.
- `nethack-c/upstream/src/trap.c:3509` through `:3511` applies generic rolling-boulder `flooreffects(singleobj, x, y, "fall")` before boulder chaining, door breakage, iron bars, wall/tree stops, and final placement.
- `nethack-c/upstream/src/do.c:185` through `:266` handles boulder liquid and pit/hole/trapdoor floor effects and deletes consumed floor objects with `useupf(obj, 1L)`.
- `nethack-c/upstream/src/invent.c:4763` through `:4780` shows `useupf()` suppresses new costly-spot shop debt while `svc.context.mon_moving` is set, then deletes the object.
- `nethack-c/upstream/src/shk.c:1218` through `:1224` shows deletion still preserves an existing bill entry as `useup` when the object is already on a shopkeeper's bill.

## JS Coverage

- `js/allmain.js` now passes `{ usedUpShopBillOnDestroy: true }` into both rolling-boulder path floor-effect calls.
- The existing `game._monster_moving` guard remains around those calls, so this does not synthesize new hero-caused costly-floor debt for monster-triggered launches.
- The existing `earthFloorEffects()` billing option only marks real existing bill entries through `markObjectShopBillUsedUp()`, preserving C's already-billed-object deletion behavior without creating field-only stale debt.

## Tests

- `rolling boulder filling billed path pit preserves used-up bill row`
- `rolling boulder sinking billed path lava preserves used-up bill row`

## Remaining Edges

- Hero-triggered rolling boulder still uses the simplified command-side launcher and does not yet share the full monster `launch_obj()` path.
- Mounted-steed diversion and shop/timer-specific final `place_object()` side effects remain separate rolling-boulder slices.
