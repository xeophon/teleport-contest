# Subagent Findings 117 - Upward Pyrolisk Egg Toss-Up

## Implemented Slice: Hero-Thrown Pyrolisk Egg Upward Impact

Covered the upward hero-thrown `toss_up()` branch for pyrolisk eggs. Pyrolisk eggs now use the C-shaped roof/self/floor break-test ordering, explode through the pyrolisk `breakobj()` fireball branch when they break, and can still survive the rare resistance path and land as floor objects.

C source:

- `nethack-c/upstream/src/dothrow.c:1256`: `toss_up()` receives the already-decided upward roof-hit boolean.
- `nethack-c/upstream/src/dothrow.c:1268`: roof-hit objects run `breaktest()` before falling back on the hero.
- `nethack-c/upstream/src/dothrow.c:1270`: roof break prints the ceiling-hit message, calls `breakmsg()`, then `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: non-roof-break survivors fall back on the hero's head.
- `nethack-c/upstream/src/dothrow.c:1291`: self-hit break checks use another `breaktest()`.
- `nethack-c/upstream/src/dothrow.c:1319`: non-petrifying eggs that break on self-hit print the face message after break effects if the hero survives.
- `nethack-c/upstream/src/dothrow.c:1588`: upward throws call `toss_up(obj, rn2(5) && !Underwater)`, so `rn2(5)` is the first RNG event.
- `nethack-c/upstream/src/dothrow.c:2529`: `breakobj()` detects pyrolisk eggs for explosion handling.
- `nethack-c/upstream/src/dothrow.c:2570`: `breakobj()` deletes the object before resolving the explosion.
- `nethack-c/upstream/src/dothrow.c:2572`: pyrolisk eggs call `explode(x, y, -11, d(3,6), 0, EXPL_FIERY)`.
- `nethack-c/upstream/src/dothrow.c:2592`: `breaktest()` calls `obj_resists(obj, 1, 99)`.
- `nethack-c/upstream/src/dothrow.c:2600`: ordinary eggs are breakable unless the object-resistance roll succeeds.
- `nethack-c/upstream/src/dothrow.c:2640`: egg `breakmsg()` prints `Splat!`.
- `nethack-c/upstream/include/mondata.h:200`: touch-petrification gates only apply to touch-petrifying monster data; pyrolisk eggs are fire explosive, not petrifying.

Subagent findings:

- The C audit confirmed pyrolisk eggs are not petrifiers. They should use the ordinary egg face message on self-hit break, not petrification handling.
- The first upward RNG event is `rn2(5)` for roof-hit selection. Each roof, self-hit, and floor impact break test then consumes `rn2(100)` through `obj_resists()`.
- When a pyrolisk egg breaks, C deletes the thrown object before rolling `d(3,6)` and resolving the fireball. This means the thrown egg itself is not available for inventory fire damage.
- Explosion feedback appears after `Splat!`. On self-hit, the face message comes after explosion damage if the hero survived.
- The JS audit found existing `isPyroliskEgg()` and `resolvePyroliskEggExplosion()` support, but upward egg support explicitly excluded pyrolisk eggs, so this needed a dedicated upward branch before later object-specific toss-up branches.

Covered JS behavior:

- `js/cmd.js`: added pyrolisk-egg upward helpers for roof/self/floor break tests and C-shaped message ordering.
- `js/cmd.js`: upward pyrolisk eggs are split from inventory and shop billing before impact resolution, then removed before the explosion helper runs.
- `js/cmd.js`: breaking pyrolisk eggs mark broken-object debt, print `Splat!`, roll `d(3,6)`, resolve the fireball at the hero square, and append the face message only when appropriate.
- `js/cmd.js`: rare nonbreaking pyrolisk eggs deal the ordinary 1 HP self-hit damage and land through `landProjectileObjectWithShopHandling()`.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: self-hit pyrolisk egg break prints the fall-back message, `Splat!`, fireball messages, and then the face message while consuming `rn2(5)`, `rn2(100)`, and `d(3,6)` in order.
- `test/shop-billing-helpers.test.mjs`: roof-hit pyrolisk egg break prints the ceiling-hit message and explosion without falling back or printing the face message.
- `test/shop-billing-helpers.test.mjs`: a pyrolisk egg that survives both self-hit and floor break tests lands at the hero square as a pyrolisk egg after only the ordinary 1 HP self-hit.
- `test/shop-billing-helpers.test.mjs`: an unpaid pyrolisk egg broken by the hero is charged as broken before the explosion resolves.

Verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter spec --test-name-pattern "pyrolisk egg" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter spec --test-name-pattern "venom|cream pie|upward hero-thrown scroll|upward hero-thrown harmless|upward hero-thrown unpaid harmless|melon|ordinary egg|pyrolisk egg|glass-material wand|unknown glass wand|crystal plate mail" test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)

## Remaining Upward Throw Gaps

- Full `explode()` terrain and floor-object collateral for pyrolisk egg fireballs remains broader explosion/floor-fire work.
- Explosion noise wake-up coverage remains tied to broader explosion alerting.
- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering.
- Broader glass/crystal object breakage remains separate until more object metadata is registry-backed instead of name-only.
- Touch-petrifying eggs/corpses need stone-resistance, stone-golem polymorph rescue, and helmet wording before they are safe to implement.
- Generic damaging upward impacts still need full `dmgval()`, hard-helmet mitigation, `Maybe_Half_Phys()` mitigation, silver/blessed bonuses, and heavier falling-object effects beyond this pyrolisk egg slice.
