# 137 - Force-destroyed ice-box survivor timers and fresh follow-up audits

## Implemented Slice

Helper-level destroyed ice boxes now resume surviving corpse contents with the C `breakchestlock()` timer path. Real `#force` still does not target ice boxes: C `Is_box()` only accepts large boxes and chests, and JS `isForceableBoxObject()` continues to match that restriction.

Surviving ice-box corpse contents now treat their stored age as frozen relative age, convert it back to actual corpse age, clear ice-box bookkeeping, restart the normal corpse timeout, and then apply floor ice timer effects after placement. This is intentionally not the ordinary ice-box takeout path because C `removed_from_icebox()` sets non-ice-troll corpses `norevive`, while `breakchestlock()` does not.

C anchors:

- Real `#force` scans only `Is_box()` containers: `nethack-c/upstream/include/obj.h:338`, `nethack-c/upstream/src/lock.c:676`, `nethack-c/upstream/src/lock.c:717`.
- Destroyed box contents are extracted, may destroy one stack unit, then surviving ice-box corpses get `age = moves - age`, `start_corpse_timeout()`, and `place_object()`: `nethack-c/upstream/src/lock.c:162`, `nethack-c/upstream/src/lock.c:184`, `nethack-c/upstream/src/lock.c:199`, `nethack-c/upstream/src/lock.c:201`, `nethack-c/upstream/src/lock.c:203`.
- Ordinary ice-box takeout is distinct and sets `norevive`: `nethack-c/upstream/src/pickup.c:2781`, `nethack-c/upstream/src/pickup.c:2792`, `nethack-c/upstream/src/pickup.c:2793`.
- Floor placement runs object timer checks, including corpse-on-ice adjustment: `nethack-c/upstream/src/mkobj.c:1389`, `nethack-c/upstream/src/mkobj.c:2305`, `nethack-c/upstream/src/mkobj.c:2365`, `nethack-c/upstream/src/mkobj.c:2440`.

JS changes:

- `forceBoxSimpleName()` now names helper-level destroyed ice boxes correctly without widening the command target filter: `js/cmd.js:9184`.
- Added `brokenChestSourceIsIceBox()` and `thawBrokenIceBoxCorpseSurvivor()` for the lock-path thaw/restart without `norevive`: `js/cmd.js:9381`, `js/cmd.js:9387`.
- `placeBrokenChestContentAtHero()` now funnels both non-destroyed survivors and one-unit shatter-stack survivors through thaw, placement, stack merge, and `objectIceEffect()`: `js/cmd.js:9399`, `js/cmd.js:9406`, `js/cmd.js:9412`, `js/cmd.js:9453`, `js/cmd.js:9457`.

## Tests Added

Added focused forced-container coverage in `test/shop-billing-helpers.test.mjs`:

- locked ice boxes remain ignored by real `#force`: `test/shop-billing-helpers.test.mjs:12420`;
- destroyed ice-box corpse survivors thaw, restart timers, and avoid ordinary takeout `norevive`: `test/shop-billing-helpers.test.mjs:12484`;
- destroyed ice-box corpse stacks lose one shattered unit while thawing the remaining stack: `test/shop-billing-helpers.test.mjs:12514`;
- survivors placed onto ice get the floor ice timer adjustment: `test/shop-billing-helpers.test.mjs:12543`.

## Fresh Follow-Up Audits

Russell deepened kicked floor-object shipping. C `dokick()` checks adjacent floor objects before terrain/door handling, routes them through `kick_object()`, `bhit()`, and `ship_object()`, including down-gate migration and floor-pile impact. JS `kickDirection` still has no floor-object branch. A bounded next slice is ordinary non-shop, non-gold, non-container, non-boulder kicked objects through seen hole/trapdoor shipping before stairs/ladders and shop billing.

McClintock deepened monster-thrown projectile delivery. C `m_throw()` tracks hit state through `drop_throw(obj, ohit, x, y)`: hit-only missile loss, eggs/pies/venom destruction, shipping, placement, and passive object effects have defined ordering. JS `landMonsterThrownObject()` lacks `ohit` state. A bounded slice is terminal landing parity first, then occupied-target path walking later.

Godel confirmed the selected ice-box survivor slice and kept mimic wake as a separate test gap. The mimic wake helper already preserves disguise state, but visible object and furniture mimic wake coverage remains pending.

Raman recommended raised-drawbridge under-terrain movement classification before burning-oil hero liquid fallout. C `is_pool()`, `is_lava()`, and `is_ice()` classify `DRAWBRIDGE_UP` by `DB_UNDER`; JS movement currently uses raw terrain checks that can treat every raised drawbridge as water-like.

Tesla recommended named ordinary floor statues as the first stone-to-flesh follow-up. C `animate_statue()` christens non-unique animated monsters from statue `ONAME`; JS displays named statues but does not copy the name onto the created monster. Historic Archeologist guilt and unique/cant-revive directed doppelganger animation remain later slices.

## Deferred Gaps From This Agent Round

- Kicked-object shipping: ordinary object selection, in-flight down-gates, and floor-pile impact remain open; stairs/ladders, shop billing, containers, boulders, ball/chain, and gold are later subcases.
- Monster-thrown projectiles: terminal `drop_throw()` hit-state parity, occupied-monster-before-hero targeting, and passive object mutation remain open.
- Forced-container mimic wake: add visible object and furniture mimic preservation tests before changing behavior.
- Terrain movement: raised-drawbridge under-terrain liquid classification and broader hero liquid fallout after terrain-created water/lava remain open.
- Stone-to-flesh: named statue christening, Archeologist historic guilt, and unique/cant-revive directed doppelganger statue animation remain open.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "locked ice boxes|destroyed ice box" test/shop-billing-helpers.test.mjs` - 4 pass, 905 skipped
- `node --test --test-name-pattern "ice box|#force command|destroyed box" test/shop-billing-helpers.test.mjs` - 10 pass, 899 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 909/909
- `npm run score` - 44/44
