# 144 - Metallivorous metal accessory eataccessory

## Implemented Slice

Hero metallivores eating metal rings and amulets now run a C-shaped `eataccessory()` path after the nutrition gain and taste discovery. Rings use the C 1-in-3 effect gate and 15 nutrition fallback; amulets use the C 1-in-5 effect gate and the existing 20-weight nutrition. Tasting an accessory marks the eaten object known/discovery-known and records the observed appearance without globally identifying the object type unless the C branch would call `makeknown()`.

The slice covers the common intrinsic/stat/protection rows used by public JS state today. It deliberately keeps several equipment-state and delayed-status edges deferred rather than inventing a wider status model in this pass.

C anchors:

- Metallic non-food eligibility reaches rings and amulets through `is_edible()` and `is_metallic()`: `nethack-c/upstream/src/eat.c:91`.
- `doeat_nonfood()` prints the metal-object taste text before dispatching into `eatspecial()`, then grants nutrition after the special object handling: `nethack-c/upstream/src/eat.c:2789`, `nethack-c/upstream/src/eat.c:2801`, `nethack-c/upstream/src/eat.c:2911`.
- `eatspecial()` routes rings and amulets to `eataccessory()` and clears consumed inventory roles after the accessory path: `nethack-c/upstream/src/eat.c:2414`, `nethack-c/upstream/src/eat.c:2452`, `nethack-c/upstream/src/eat.c:2471`.
- `eataccessory()` first removes worn-ring state, observes/tastes the object, then applies the 1-in-3 ring and 1-in-5 amulet effect gates: `nethack-c/upstream/src/eat.c:2265`, `nethack-c/upstream/src/eat.c:2273`, `nethack-c/upstream/src/eat.c:2278`, `nethack-c/upstream/src/eat.c:2280`.
- Generic property and special accessory branches live in the `oc_oprop`, stat, levitation, change, guarding, strangulation, unchanging, and no-effect rows: `nethack-c/upstream/src/eat.c:2286`, `nethack-c/upstream/src/eat.c:2291`, `nethack-c/upstream/src/eat.c:2407`.
- C ring and amulet object rows define the relevant identities and nutrition/weight metadata: `nethack-c/upstream/include/objects.h:735`, `nethack-c/upstream/include/objects.h:830`.

JS changes:

- Added known-ring discovery support for the C branches that really identify a ring, while keeping mere taste as observed appearance only: `js/cmd.js:4874`.
- Ring nutrition now falls back to 15 for ring-like metal objects without explicit nutrition: `js/cmd.js:18812`.
- Added the metal accessory helpers, chance gates, ring property mapping, amulet property mapping, C-shaped makeknown restrictions, and taste-observation path: `js/cmd.js:18824`, `js/cmd.js:18871`, `js/cmd.js:18960`, `js/cmd.js:19026`, `js/cmd.js:19032`.
- `eatHeroNonFoodMetal()` now applies accessory effects after nutrition and before consuming the object: `js/cmd.js:19109`.
- Magical breathing granted by eating the amulet now also satisfies the hero choking/breathless helper: `js/cmd.js:16441`.
- Observed ring appearances now appear in discoveries in the same shape as the existing observed amulet entries: `js/display.js:554`.

Tests:

- Metal ring eating can grant an intrinsic through the C chance gate while recording only observed ring appearance for a generic property row: `test/shop-billing-helpers.test.mjs:8852`.
- Failed ring chance still tastes/observes the ring without granting or globally identifying the ring type: `test/shop-billing-helpers.test.mjs:8875`.
- Metal amulet of guarding grants protection and `ublessed` through the C amulet gate without globally identifying guarding: `test/shop-billing-helpers.test.mjs:8896`.
- Metal amulet of change follows the C `makeknown()` branch and toggles hero sex: `test/shop-billing-helpers.test.mjs:8921`.

## Fresh Audit Backlog

- Raised drawbridges still need movement-local effective terrain from `DB_UNDER` for moat, lava, ice, and floor movement effects. C anchors include `nethack-c/upstream/src/dbridge.c:45`, `nethack-c/upstream/src/dbridge.c:61`, `nethack-c/upstream/src/dbridge.c:85`, `nethack-c/upstream/src/dbridge.c:100`, `nethack-c/upstream/include/rm.h:146`, and `nethack-c/upstream/src/hack.c:1883`.
- Monster-thrown `drop_throw(ohit)` still needs true hit-state propagation for eggs, missile mulch, passive-object effects, and monster-before-hero ordering. C anchors include `nethack-c/upstream/src/mthrowu.c:162`, `nethack-c/upstream/src/mthrowu.c:170`, `nethack-c/upstream/src/mthrowu.c:174`, `nethack-c/upstream/src/mthrowu.c:188`, and `nethack-c/upstream/src/dothrow.c:1976`.
- Stone-to-flesh/statue animation still needs the shared `cant_revive()`/directed-doppelganger rows for unique/no-corpse statues and statue traps. C anchors include `nethack-c/upstream/src/read.c:3111`, `nethack-c/upstream/src/trap.c:725`, `nethack-c/upstream/src/trap.c:907`, `nethack-c/upstream/src/zap.c:1991`, and `nethack-c/upstream/src/mon.c:5278`.
- Projectile down-gates still need stairs, ladders, special stairs, kicked-object paths, and migration-delivery metadata beyond the covered seen holes/trap doors. C anchors include `nethack-c/upstream/src/dokick.c:1953`, `nethack-c/upstream/src/dokick.c:1958`, `nethack-c/upstream/src/dothrow.c:1819`, `nethack-c/upstream/src/dothrow.c:2715`, and `nethack-c/upstream/src/stairs.c:64`.

## Deferred Gaps

- Full non-food fullness/choking and `lesshungry()` ordering remains broader eating-core work.
- Cursed non-food `rottenfood()` handling and the slow-digestion special branch remain separate from this accessory-effect slice.
- Worn-ring `Ring_gone()` cleanup is only blocked by the existing worn-item guard; full worn accessory teardown remains equipment-state work.
- Amulet of strangulation is still a narrow lethal approximation. C's recoverable choking countdown and all status interactions remain deferred.
- Protection-from-shape-changers still lacks `rescham()` fallout after eating that ring.
- Exact C `makeknown()`/status/equipment side effects are only covered for the implemented visible/toggle branches.

## Verification

- `node --check js/cmd.js && node --check js/display.js && node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "metallivorous metal ring eating|metallivorous metal amulet" test/shop-billing-helpers.test.mjs` - 4 pass, 927 skipped.
- `node --test test/*.mjs` - 1012 pass.
- `npm run score` - 44/44 pass.
