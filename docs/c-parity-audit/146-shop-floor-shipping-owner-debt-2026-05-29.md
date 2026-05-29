# 146 - Shop-floor shipping owner debt

## Implemented Slice

Shop-floor objects knocked down a seen hole/trap-door impact now charge live bill owners found on the object tree before falling back to the floor shopkeeper's stock value. This fixes the `shipObjectShopDebt(..., { shopFloorObj: true })` branch used by `impactDropFloorObjects()` while leaving the carried/unpaid shipping branch unchanged.

C anchors:

- `find_objowner()` checks the shop rooms at the object location and prefers an object already on a live bill before using the default shopkeeper for that square: `nethack-c/upstream/src/shk.c:1082`.
- `stolen_value()` uses that owner, removes live bill rows with `sub_one_frombill()`, and then charges the lost value as debit/robbed value: `nethack-c/upstream/src/shk.c:3753`.
- Container loss recurses through contents and removes bill rows during lost-merchandise valuation: `nethack-c/upstream/src/shk.c:3661`, `nethack-c/upstream/src/shk.c:3712`.
- `ship_object()` calls `stolen_value()` for shop-floor objects before clearing `no_charge` and migrating the object: `nethack-c/upstream/src/dokick.c:1695`.

JS changes:

- `shipObjectShopDebt()` now uses the owner-aware lost-merchandise charge map for its `shopFloorObj` branch instead of a single square-owner `lostShopMerchandiseValueForObject()` result: `js/cmd.js:24196`.
- The branch records debit/robbed deltas across every charged shopkeeper, reports the charged owner for single-owner losses, and still clears recursive `no_charge` after valuation: `js/cmd.js:24198`, `js/cmd.js:24209`, `js/cmd.js:24220`.

Tests:

- Shop-floor stock falling through a hole with a live bill owned by another shopkeeper charges that owner, clears the row, migrates the object, and does not debit the square shopkeeper: `test/shop-billing-helpers.test.mjs:11904`.
- A no-charge shop-floor container falling through a hole charges a nested live bill owner, clears the nested row, migrates the container, and clears recursive `no_charge`: `test/shop-billing-helpers.test.mjs:11928`.

## Fresh Audit Backlog

- Bag-of-tricks discovery is the smallest next bag slice: `#loot` bite and visible `bagotricks()` output should globally discover the tool type, zero-charge known-state should depend on global discovery, and known bag-of-tricks targets should be excluded from `#tip`. C anchors include `nethack-c/upstream/src/pickup.c:2150`, `nethack-c/upstream/src/pickup.c:3912`, and `nethack-c/upstream/src/makemon.c:2592`.
- Down-gate migration needs a shared metadata layer before broadening projectile/kick shipping: C covers stairs, ladders, special stairs, holes, and trap doors, with reciprocal landing metadata and ladder-specific no-stay behavior. C anchors include `nethack-c/upstream/src/dokick.c:1657`, `nethack-c/upstream/src/dokick.c:1743`, and `nethack-c/upstream/src/stairs.c:64`.
- Apply/getobj prompt parity has a narrow `?` vs `*` split: C `getobj()` shows suggested apply items for `?` but full inventory for `*`, while JS currently filters both through apply candidates. C anchors include `nethack-c/upstream/src/invent.c:1919`, `nethack-c/upstream/src/invent.c:1979`, and `nethack-c/upstream/src/apply.c:4226`.
- Polymorph wand rays are still adjacent-only in JS. C uses an immediate `bhit()` range, handles floor piles along the ray, only prints shuddering vibrations after object shock, and has a monster-hit path. C anchors include `nethack-c/upstream/src/zap.c:3448`, `nethack-c/upstream/src/zap.c:3827`, and `nethack-c/upstream/src/zap.c:4031`.

## Deferred Gaps

- This slice does not implement the full shared `find_objowner()` room-overlap semantics for every caller; it only replaces the shop-floor shipping charge path with the existing owner-aware charge primitive.
- Buried/freezing merchandise messages still have older single-default-shopkeeper wording in some owner-billed cases, even when the debit is routed to the live owner.
- Generic `obfree()` preservation, full `stolen_container()` fidelity, down-stairs/ladder migration metadata, and kicked floor-object shipping remain separate slices.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "shop-floor (stock|billed stock|container|fragile stock) falling through a hole|remote projectile fall bills impacted shop-floor pile|remote projectile no-drop impact" test/shop-billing-helpers.test.mjs` - 8 pass, 930 skipped.
- `node --test test/shop-billing-helpers.test.mjs` - 938 pass.
- `node --test test/*.mjs` - 1019 pass.
- `npm run score` - 44/44 pass.
