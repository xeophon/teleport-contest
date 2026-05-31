# Impact Drop Delivery Scatter

## C anchors

- `nethack-c/upstream/src/dokick.c:1802` resolves queued object delivery for `MIGR_LADDER_UP`, `MIGR_STAIRS_UP`, and `MIGR_SSTAIRS`.
- `nethack-c/upstream/src/dokick.c:1824` places exact down-gate arrivals on the reciprocal stair or ladder square.
- `nethack-c/upstream/src/dokick.c:1836` stacks the delivered object before post-delivery movement.
- `nethack-c/upstream/src/dokick.c:1837` scatters exact arrivals with `scatter(nx, ny, rnd(2), 0, otmp)` unless delivery is marked no-scatter.
- `nethack-c/upstream/src/explode.c:721` implements `scatter()`: choose a direction with `rn2(N_DIRS)`, choose range with `rnd(force - weight / 40)`, walk until blocked by non-`ZAP_POS` terrain or closed doors, then apply floor effects and stack at the final square.

## JS anchors

- `js/cmd.js:4546` checks scatter-blocking terrain and closed doors.
- `js/cmd.js:4552` consumes `rnd(2)`, `rn2(N_DIRS)`, and the weighted `rnd()` range roll for reciprocal stair, ladder, and branch-stair arrivals.
- `js/cmd.js:4579` applies floor effects at the scattered landing square and restacks surviving objects there.
- `js/cmd.js:4606` now mirrors the exact-arrival scatter step after queued delivery break checks.
- `test/shop-billing-helpers.test.mjs:30505` covers projectile ladder scatter, fragile pile delivery, and branch-stair scatter.
- `test/shop-billing-helpers.test.mjs:23133` covers command-drop ladder delivery and the C ordering where stacking happens before scatter.

## Result

Exact queued down-gate deliveries no longer remain pinned to the reciprocal stair/ladder square. They are placed, stacked, and scattered using the same directional RNG shape as C. Random shaft/trap-door deliveries remain unchanged.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern='projectile down ladder|queued exact down-gate|branch stairs|queued random delivery|remote shaft|projectile down stairs' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern='impact|projectile|monster-thrown|remote shaft|down ladder|down stairs|branch stairs|queued .*delivery' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.test.mjs`
- `npm run score` (44/44)
