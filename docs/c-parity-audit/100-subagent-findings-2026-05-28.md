# Subagent Findings 100 - Remote Projectile Down-Gate

## Implemented Slice: Remote Hero Projectile `ship_object()` On Seen Shafts

Implemented the next projectile shipping row: hero-thrown non-gold projectiles that land on a remote seen `HOLE` or `TRAPDOOR` now run the C `ship_object()`-style down-gate after `flooreffects()` declines and before floor placement, container impact, shop return/sale, or stacking.

C source:

- `nethack-c/upstream/src/dothrow.c:1780`: hard-landing `breaktest()` happens before floor effects or `ship_object()`.
- `nethack-c/upstream/src/dothrow.c:1804`: `flooreffects(obj, x, y, "fall")` runs before the post-floor shipping gate.
- `nethack-c/upstream/src/do.c:288`: non-boulder hole/trapdoor floor effects are hero-square-only, so remote projectiles reach `ship_object()`.
- `nethack-c/upstream/src/dothrow.c:1819`: with no monster hit, `ship_object()` runs before current-level placement.
- `nethack-c/upstream/src/dothrow.c:1824`: placement, container impact, shop landing/sale, and stacking only run after `ship_object()` declines.
- `nethack-c/upstream/src/dokick.c:1651`: `ship_object()` starts by resolving `down_gate()`.
- `nethack-c/upstream/src/dokick.c:1657`: non-ladder hole/trapdoor shipping uses `rn2(3)`; only zero migrates the object.
- `nethack-c/upstream/src/dokick.c:1684`: visible transit messaging precedes debt, breakage, and migration.
- `nethack-c/upstream/src/dokick.c:1695`: unpaid/shop-floor debt conversion precedes the ship-specific break check.
- `nethack-c/upstream/src/dokick.c:1717`: the second `breaktest()` can break the shipped object before migration.
- `nethack-c/upstream/src/dokick.c:1743`: surviving objects are migrated rather than placed, sold, or stacked on the current level.
- `nethack-c/upstream/src/dothrow.c:2698`: thrown gold has a separate ordering and remains out of this slice.

JS now mirrors the covered row:

- `js/cmd.js:3487`: `impactDropObjectBreaks()` now spends the C-shaped resistance roll before checking whether the object type can break.
- `js/cmd.js:21039`: `remoteProjectileShaftTrapAt()` gates remote seen `HOLE`/`TRAPDOOR` projectiles, skips hero-square floor-effect cases, skips gold, and skips occupied monster squares.
- `js/cmd.js:21053`: `maybeShipRemoteProjectileObject()` runs the post-floor remote shipping path.
- `js/cmd.js:21056`: the fall roll uses `rn2(3)` and only ships on zero.
- `js/cmd.js:21060`: visible transit text uses `cansee()` and the existing `through the hole` / `through the trap door` wording.
- `js/cmd.js:21062`: unpaid projectile debt runs before ship breakage via `shipObjectShopDebt()`, avoiding same-shop return.
- `js/cmd.js:21064`: ship breakage prints muffled crash/splat and does not run potion vapor.
- `js/cmd.js:21070`: survivors are queued in `_impact_drop_migrations` instead of placed, sold, impacted, or stacked.
- `js/cmd.js:21110`: `landProjectileObjectWithShopHandling()` invokes this gate after `earthFloorEffects()` and before `placeUnstackedFloorObject()`.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:16647`: paid same-shop dagger projectiles on remote seen `HOLE` and `TRAPDOOR` ship before sale/stacking.
- `test/shop-billing-helpers.test.mjs:16675`: unpaid remote projectile shipping converts the live bill row to shop debt before migration.
- `test/shop-billing-helpers.test.mjs:16701`: fragile remote projectile shipping charges debt before muffled breakage and does not queue the broken object.
- `test/shop-billing-helpers.test.mjs:16729`: top-level hard-landing break still preempts remote shaft shipping.
- `test/shop-billing-helpers.test.mjs:16744`: a nonzero shaft roll declines shipping and continues into normal same-shop sale and stacking.

## Remaining Projectile `ship_object()` Gaps

- Floor-pile impact loss remains separate: C `ship_object()` detects existing floor piles before the fall/stay result, emits impact transit wording, then calls `impact_drop()` on no-drop or after projectile migration.
- Thrown gold remains separate: C `throw_gold()` calls `ship_object()` before floor effects, and current thrown-gold donation-before-stack coverage is not that path.
- Kicked object shipping remains separate: `kick_object()` has its own impact, box/lock, fragile break, gold scatter/costly-gold, `bhit()`, shipping, shop settlement, floor-effect, placement, and stacking order.
- Stairs, ladders, and special-stairs down-gates remain separate: ladders do not use the `rn2(3)` stay roll for ordinary objects.
- Monster-thrown ordering remains separate: C `drop_throw()` checks `ship_object()` before `flooreffects()`, while JS still routes monster-thrown landing through floor effects before placement/stacking.

## Fresh Follow-Up Audits

### Floor-Pile Impact After Projectile Shipping

C source:

- `nethack-c/upstream/src/dokick.c:1665`: `ship_object()` counts other objects on the landing square before the fall/stay branch.
- `nethack-c/upstream/src/dokick.c:1687`: when the projectile stays, impacted pile objects can still fall through `impact_drop()` before ordinary placement resumes.
- `nethack-c/upstream/src/dokick.c:1752`: when the projectile migrates, impacted pile objects are processed after the projectile is added to migration.
- `nethack-c/upstream/src/dokick.c:1511`: `impact_drop()` rolls each pile object independently and migrates selected objects without ship-specific breakage.
- `nethack-c/upstream/src/dokick.c:1595`: missile-caused impact uses `From the impact, ... other object(s).` wording instead of the adjacent-object wording.

Smallest safe next slice: extend the remote projectile shipping path to account for non-projectile objects already on the landing square. Cover both `rn2(3)==0` and nonzero projectile outcomes, pile object fall rolls, no ship-breakage for pile objects, and shop debt for lost shop-floor pile objects.

### Other Deferred Shipping Rows

- Keep gold shipping out of non-gold projectile work because C `throw_gold()` checks `ship_object()` before `flooreffects()`.
- Keep kicked objects out of projectile landing because their source path has separate pre-`ship_object()` break and shop/gold handling.
- Keep ladder/stairs shipping out of seen-shaft work because `down_gate()` sets different migration destinations and ladders skip the ordinary `rn2(3)` stay chance.
- Keep monster-thrown object ordering with monster combat/placement work because it needs `drop_throw()` and `landMonsterThrownObject()` alignment, not hero projectile shop-sale alignment.
