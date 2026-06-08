# C Parity Audit 851: Kicked Shop-Floor Shipping Debt

Closed a kicked floor-object shipping gap for ordinary shop merchandise. JS already supported kicked ordinary objects falling through down-gates and already had a `shopFloorObj` debt mode for C `ship_object()`, but the kick support gate rejected non-fragile costly floor objects before the shipping branch could charge and migrate them. Kicked ordinary shop-floor objects can now ship through seen holes/trapdoors and down stairs while charging shop-floor merchandise debt before migration.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:733` through `:738`: kicked floor objects are extracted and routed through `bhit(..., KICKED_WEAPON, ...)`.
- `nethack-c/upstream/src/dokick.c:752` through `:755`: after flight, C returns when `ship_object()` has already migrated the kicked object.
- `nethack-c/upstream/src/dokick.c:1638` through `:1640`: `ship_object(otmp, x, y, shop_floor_obj)` takes an explicit shop-floor flag.
- `nethack-c/upstream/src/dokick.c:1684` through `:1695`: visible transit feedback and the no-drop check happen before shop-floor debt.
- `nethack-c/upstream/src/dokick.c:1695` through `:1711`: unpaid objects and `shop_floor_obj` merchandise are charged before breakage or migration.
- `nethack-c/upstream/src/dokick.c:1717` through `:1746`: breakage uses muffled feedback after debt; surviving objects are added to migration.
- `nethack-c/upstream/src/dokick.c:1943` through `:1960`: `down_gate()` prefers down stairs, then down ladders, then seen holes/trapdoors.

## JS Changes

- `js/cmd.js`
  - `kickFloorObjectSupported()` now permits a costly ordinary floor object only when the next square is a valid down-gate.
  - `kickFloorObjectToward()` computes the down-gate before the support gate and passes a kick-specific `shopFloorObj` flag to remote projectile shipping when the source square is costly.
  - `maybeShipRemoteProjectileObject()` now forwards that flag to `shipObjectShopDebt()`, reusing the existing C-shaped shop-floor debt helper.
- `test/shop-billing-helpers.test.mjs`
  - Added seen-hole and down-stairs canaries for kicked ordinary shop-floor daggers.
  - The tests assert migration, `goods lost` debt wording, debit accounting, and no robbery/bill-row drift.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "command kicked shop-floor ordinary object|command kick ordinary floor object" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "command kicked shop-floor ordinary object|command kick ordinary floor object|command kicked fragile|remote projectile fall" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Kicked ordinary shop-floor down-ladder shipping and no-drop impact billing are still covered by the shared helper behavior but do not yet have dedicated canaries.
- Broader kicked-object parity still excludes gold scatter, boulders, containers with contents, and general same-level shop-floor projectile sales.
