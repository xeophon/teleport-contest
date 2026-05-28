# Subagent Findings 101 - Projectile Floor-Pile Impact Drop

## Implemented Slice: Remote Projectile `impact_drop()` On Existing Floor Piles

Extended the remote non-gold hero projectile `ship_object()` row to include existing floor-pile impact handling. When a projectile lands on a remote seen hole or trap door with other objects already on that square, JS now counts the pile before the projectile fall/stay branch, emits C-shaped transit wording, and runs `impact_drop()` either before ordinary placement resumes or after the projectile itself is queued for migration.

C source:

- `nethack-c/upstream/src/dothrow.c:1819`: hero-thrown objects call `ship_object()` before current-level placement, container impact, shop sale, or stacking.
- `nethack-c/upstream/src/dokick.c:1657`: ordinary hole/trapdoor shipping uses the `rn2(3)` stay/fall branch; ladders remain separate.
- `nethack-c/upstream/src/dokick.c:1665`: `ship_object()` scans the destination pile and counts other objects before the branch result is applied.
- `nethack-c/upstream/src/dokick.c:1684`: visible `otransit_msg()` runs before debt, breakage, migration, or pile movement.
- `nethack-c/upstream/src/dokick.c:1687`: if the projectile stays, impacted pile objects can still fall before `ship_object()` returns false to the caller.
- `nethack-c/upstream/src/dokick.c:1717`: ship-specific projectile breakage happens before projectile migration and before post-migration pile impact.
- `nethack-c/upstream/src/dokick.c:1743`: surviving projectiles are added to migration before the impacted pile is processed.
- `nethack-c/upstream/src/dokick.c:1752`: post-migration projectile impact calls `impact_drop()`.
- `nethack-c/upstream/src/dokick.c:1557`: rock missiles cannot knock boulders down through impact.
- `nethack-c/upstream/src/dokick.c:1567`: boulders use the rare `rn2(30)` fall chance; other eligible objects use `rn2(3)`.
- `nethack-c/upstream/src/dokick.c:1573`: costly impacted shop-floor objects are billed silently through `stolen_value()` before migration.
- `nethack-c/upstream/src/dokick.c:1595`: missile-caused pile impact uses `From the impact, ... other object(s) fall.` wording.
- `nethack-c/upstream/src/dokick.c:1626`: shop debt for impacted floor goods is reported after the impact message.
- `nethack-c/upstream/src/dokick.c:1909`: `otransit_msg()` prints `hits another/other object(s)` and adds `and falls ...` only for projectile migration.

JS now mirrors the covered row:

- `js/cmd.js:3381`: `emptyImpactDropResult()` gives all floor-impact callers a stable result shape.
- `js/cmd.js:3420`: `impactDropCandidatePile()` scans the landing square while excluding the projectile itself.
- `js/cmd.js:3425`: `impactDropPileQuantity()` preserves C's quantity-based impact count for wording.
- `js/cmd.js:3429`: `impactDropFloorObjects()` now returns impact counts and can run in missile-impact mode.
- `js/cmd.js:3443`: rock projectile impacts skip boulders.
- `js/cmd.js:3453`: missile impact visibility and `From the impact` wording now use the C split between all, one-of-many, and many-of-many fallen objects.
- `js/cmd.js:21052`: projectile shipping results include `noDrop` and the pile-impact result.
- `js/cmd.js:21082`: remote projectile shipping resolves the target level before the branch, matching `drop_to()` setup.
- `js/cmd.js:21085`: pile quantity is counted before the projectile `rn2(3)` branch.
- `js/cmd.js:21087`: visible transit wording distinguishes plain fall, impact-and-fall, and impact-without-fall.
- `js/cmd.js:21098`: no-drop projectiles run pile impact and then return `handled: false` so placement, sale, and stacking continue.
- `js/cmd.js:21105`: falling projectiles still charge their own shop debt before ship breakage.
- `js/cmd.js:21107`: ship breakage preempts pile impact, matching C's break-before-migration order.
- `js/cmd.js:21113`: surviving projectiles are queued before impacted pile objects are processed.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:16648`: same-shop projectile tests now verify impact-and-fall transit wording while still preserving no-sale/no-stack shipping.
- `test/shop-billing-helpers.test.mjs:16676`: a remote projectile that falls queues itself before the impacted floor pile and emits both transit and impact messages.
- `test/shop-billing-helpers.test.mjs:16756`: impacted shop-floor pile objects bill as lost goods without ship-specific breakage.
- `test/shop-billing-helpers.test.mjs:16823`: a no-drop projectile can knock one pile object through the shaft, then continue into normal sale and stacking with the remaining compatible floor object.
- `test/shop-billing-helpers.test.mjs:16857`: a rock projectile can fall through a shaft while failing to knock a boulder down.

Verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- Focused `node --test --test-reporter=spec --test-name-pattern 'remote projectile|same-shop projectile|rock projectile|projectile landing runs hole|shop-floor fragile stock falling through a hole|shop-floor stock falling through a hole' test/shop-billing-helpers.test.mjs`
- `npm run score` -> `44/44`

## Remaining Shipping Gaps

- Thrown gold shipping remains separate because C `throw_gold()` calls `ship_object()` before floor effects and follows a different donation/scatter path.
- Kicked-object shipping remains separate because `kick_object()` has distinct impact, box/lock, gold, breakage, shop, and placement ordering.
- Stairs, ladders, and special-stairs down-gates remain separate because `down_gate()` chooses different migration destinations and ladders skip the ordinary stay roll.
- Monster-thrown ordering remains separate because C `drop_throw()`/`mthrowu` checks shipping before monster projectile floor effects.
- Broader `obfree()` preservation and shop ownership helper cleanup remain active outside this projectile slice.
