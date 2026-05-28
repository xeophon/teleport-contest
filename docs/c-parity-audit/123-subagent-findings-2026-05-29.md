# Subagent Findings 123 - Burning Oil Fountain Terrain Batch

## Implemented Slice: Burning-Oil Blast Fountains

Covered the direct lit-oil `potionhit()` terrain case where the 3x3 burning-oil blast passes over a fountain. The JS burning-oil floor pass now invokes the shared fire-over-fountain helper after web, ice, and water handling and before floor-object fire and monster damage. Fountain dry-up also now clears `blessedftn`, matching C `dryup()`.

C source:

- `nethack-c/upstream/src/potion.c:1866`: a lit oil potion direct monster hit calls `explode_oil(obj, tx, ty)`.
- `nethack-c/upstream/src/explode.c:962`: burning oil rolls damage and routes through `explode(..., BURNING_OIL, EXPL_FIERY)`.
- `nethack-c/upstream/src/explode.c:454`: explosion floor effects run before monster damage.
- `nethack-c/upstream/src/explode.c:503`: monster damage happens after the floor pass.
- `nethack-c/upstream/src/zap.c:5163`: fire over floor terrain handles webs, ice, water, and fountains.
- `nethack-c/upstream/src/zap.c:5229`: fire over a fountain creates `rnd(3)` gas, prints steam if visible, applies range reduction, and calls `dryup(x, y, type > 0)`.
- `nethack-c/upstream/src/fountain.c:201`: `dryup()` uses `rn2(3)` or the warned-fountain flag to decide whether the fountain dries.
- `nethack-c/upstream/src/fountain.c:223`: visible dry-up prints `The fountain dries up!`, changes terrain to `ROOM`, clears flags, clears `blessedftn`, and redraws.

Subagent findings:

- The smallest current terrain gap was not the whole burning-oil terrain matrix; it was the missing fountain call in `burnFloorObjectsFromBurningOilExplosion()`.
- Existing JS already had a shared `applyFireRayFountainTerrain()` used by ordinary fire rays. Reusing it keeps gas creation, steam text, dry-up text, and RNG ordering aligned with the fire ray implementation.
- A nearby existing helper bug was that `dryupFountainResultAt()` cleared `loc.blessed` but not `loc.blessedftn`; C clears `blessedftn`.
- Direct burning-oil door handling remains open: C reveals secret doors and consumes closed/locked doors during the same blast floor pass, without extra RNG.

Covered JS behavior:

- `js/cmd.js:13999`: the burning-oil blast floor loop now calls `applyFireRayFountainTerrain()` after ice/water terrain handling and before floor-object fire.
- `js/fountain.js:7`: successful fountain dry-up now clears `blessedftn` along with terrain flags.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:19735`: direct lit-oil hit with a visible warned fountain in the blast creates a gas cloud, prints steam and dry-up messages before monster burning-oil damage, turns the fountain to `ROOM`, clears flags and `blessedftn`, decrements `nfountains`, and consumes the fountain RNG before monster resistance.

Verification:

- `node --check js/cmd.js`
- `node --check js/fountain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "lit oil explosion" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`845/845 passing`)
- `npm run score` (`44/44 passing`)
- `git diff --check`

## Deferred Compact Candidates

- Burning-oil door terrain: `nethack-c/upstream/src/zap.c:5376` through `zap.c:5411` reveals secret doors and consumes closed/locked doors during burning-oil fire-over-floor handling. JS should add a door-only floor-pass helper after ice/water/fountain handling and before floor-object fire, with no extra RNG.
- Thrown-gold and projectile stairs/ladders down-gates: `nethack-c/upstream/src/dothrow.c:2706` calls `ship_object()` for thrown gold before floor effects/donation/stacking; `nethack-c/upstream/src/dokick.c:1943` allows ordinary down stairs, down ladders, branch/special stairs, and seen holes/trapdoors. JS currently gates only seen holes/trapdoors.
- Floor figurine stone-to-flesh animation: `nethack-c/upstream/src/zap.c:2030` animates figurines with `makemon(..., NO_MINVENT|MM_NOMSG)`, `zap.c:2035` bills with `stolen_value()` when needed, and `zap.c:2041` stops timers before deleting the floor object. JS has the carried animation slice but floor nonvegetarian figurines still remain unchanged.
- Ordinary non-petrifying corpse `toss_up()`: `nethack-c/upstream/src/dothrow.c:1588` routes upward throws through `toss_up()`, and `dothrow.c:1341` through `dothrow.c:1420` handles ordinary falling corpse damage, hard-helmet mitigation, landing, and HP loss. JS handles petrifying corpse self-hit but rejects ordinary corpse upward throws.
- Ghoul pet `dogfood()` branch: `nethack-c/upstream/src/dog.c:1040` gives ghouls old-corpse/stale-egg preferences and makes them taboo all other food, including stone-to-flesh meat. JS has no ghoul-specific pet-food branch yet.
- Destroyed ice-box survivor timers: `nethack-c/upstream/src/lock.c:199` converts surviving ice-box corpse age and restarts corpse timers before placement; `nethack-c/upstream/src/mkobj.c:2305` applies placement timer checks. JS direct forced-lock helpers do not yet thaw/restart surviving ice-box corpse contents or run placement ice effects, while real `#force` should continue to exclude ice boxes.
