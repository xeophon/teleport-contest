# 145 - Raised drawbridge movement terrain

## Implemented Slice

Hero movement now treats a raised drawbridge's `DB_UNDER` terrain as the movement surface for the local liquid checks in `moveHero()`. A raised bridge over floor or ice is no longer stopped as water, a raised bridge over lava uses the molten-lava prompt and `m`-prefix death branch, and movement from a raised bridge over floor to one over moat is treated as a terrain transition rather than a same-`DRAWBRIDGE_UP` step.

The slice deliberately avoids changing the global raw `IS_POOL()` helper. C keeps raw terrain predicates and coordinate-aware drawbridge helpers separate, so this pass only changes the movement-local decisions that need coordinate-aware surface semantics.

C anchors:

- Raw `IS_POOL()` includes `DRAWBRIDGE_UP`, while `SURFACE_AT(x,y)` maps raised drawbridges through `DB_UNDER`: `nethack-c/upstream/include/rm.h:129`, `nethack-c/upstream/include/rm.h:146`.
- Drawbridge-aware coordinate helpers distinguish moat, lava, ice, and floor under raised bridges: `nethack-c/upstream/src/dbridge.c:45`, `nethack-c/upstream/src/dbridge.c:61`, `nethack-c/upstream/src/dbridge.c:85`, `nethack-c/upstream/src/dbridge.c:100`.
- Movement danger and liquid avoidance compare the hero's current surface with the target surface rather than only raw typ equality: `nethack-c/upstream/src/hack.c:1883`, `nethack-c/upstream/src/hack.c:2462`.
- Pool and ice spot effects later use coordinate-aware `is_pool()`/`is_ice()` helpers: `nethack-c/upstream/src/hack.c:3232`, `nethack-c/upstream/src/hack.c:3403`.

JS changes:

- Added `movementSurfaceTerrain()`, `movementIsPoolAt()`, `movementIsLavaAt()`, and `movementIsLiquidAt()` next to the existing drawbridge helpers: `js/cmd.js:3801`, `js/cmd.js:3817`, `js/cmd.js:3825`, `js/cmd.js:3831`.
- `moveHero()` now computes target/current movement surfaces before liquid decisions: `js/cmd.js:36708`.
- Normal liquid avoidance, moat/lava wording, and swim-tip eligibility now key off the movement surface: `js/cmd.js:37602`.
- `m`-prefix lava death, water crawl-out, and crawl-out landing filtering now use movement-surface liquid predicates: `js/cmd.js:37791`, `js/cmd.js:37802`.

Tests:

- Raised drawbridge over floor is dry ground for movement: `test/shop-billing-helpers.test.mjs:8540`.
- Raised drawbridge over ice is not treated as water: `test/shop-billing-helpers.test.mjs:8551`.
- Raised drawbridge over lava uses molten-lava avoidance: `test/shop-billing-helpers.test.mjs:8562`.
- `m`-prefix into a raised drawbridge over lava uses the lava death branch: `test/shop-billing-helpers.test.mjs:8573`.
- Raw-typ-equal raised drawbridge under-terrain transitions still prompt when moving floor-to-moat: `test/shop-billing-helpers.test.mjs:8586`.

## Fresh Audit Backlog

- Magic bag and bag-of-tricks edges remain: bag-of-tricks `#tip` should stop after the first failed monster creation while still spending charges, shop-floor target magic-bag explosion needs a no-charge-target contents valuation proof, and bag-of-tricks loot bite damage should use C's physical-damage halving path. C anchors include `nethack-c/upstream/src/pickup.c:4013`, `nethack-c/upstream/src/makemon.c:2575`, `nethack-c/upstream/src/pickup.c:2673`, `nethack-c/upstream/src/shk.c:3490`, and `nethack-c/upstream/src/pickup.c:2150`.
- Generic `obfree()`/`stolen_value()` parity still has owner-aware container gaps. The narrow next shop slice is `shipObjectShopDebt(..., { shopFloorObj: true })` using owner-aware lost-merchandise charges instead of a single square-owner value path. C anchors include `nethack-c/upstream/src/shk.c:1082`, `nethack-c/upstream/src/shk.c:1173`, `nethack-c/upstream/src/shk.c:3661`, and `nethack-c/upstream/src/shk.c:3753`.
- Command contracts remain scattered: `getobj`, `ggetobj`/`askchain`, `getlin`, `yn_function`, `getpos`, and TTY menu selection need shared primitives before broad command rewrites. C anchors include `nethack-c/upstream/src/invent.c:1752`, `nethack-c/upstream/src/invent.c:2202`, `nethack-c/upstream/win/tty/getline.c:36`, `nethack-c/upstream/src/cmd.c:5471`, `nethack-c/upstream/src/getpos.c:575`, and `nethack-c/upstream/win/tty/wintty.c:1515`.
- Polymorph lifecycle remains broad: wand rays need real ranged monster/pile targeting, `poly_obj()` floor replacement needs shared object lifecycle, `newcham()` target selection needs armor/species rules, monster equipment cleanup needs invalid weapon/armor fallout, and hero `polymon()` needs equipment/status teardown. C anchors include `nethack-c/upstream/src/zap.c:3431`, `nethack-c/upstream/src/zap.c:1702`, `nethack-c/upstream/src/mon.c:5157`, `nethack-c/upstream/src/mon.c:5356`, and `nethack-c/upstream/src/polyself.c:735`.

## Deferred Gaps

- This slice does not implement the full C `pooleffects()`/`spoteffects()` lifecycle for being in water, leaving water, ice-warning timers, or all liquid status interactions.
- Global terrain predicates still retain their raw C-style meanings; only movement-local liquid checks were made drawbridge-surface-aware.
- Juiblex swamp naming and non-movement drawbridge helpers remain as they were outside this narrow `moveHero()` path.

## Verification

- `node --check js/cmd.js && node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "raised drawbridge" test/shop-billing-helpers.test.mjs` - 5 pass, 931 skipped.
- `node --test test/*.mjs` - 1017 pass.
- `npm run score` - 44/44 pass.
