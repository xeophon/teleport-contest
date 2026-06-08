# C Parity Audit 787: Monster-Thrown Cockatrice Egg Acidic Food Species

Implemented the next production monster-thrown petrifying egg `munstone()` food-species slice. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/include/mondata.h:88`: `acidic(ptr)` is the monster species `M1_ACID` flag, not a hardcoded acid-blob-only predicate.
- `nethack-c/upstream/src/muse.c:2915`: monster self-cure treats a corpse or tin as acidic when `acidic(&mons[obj->corpsenm])` is true.
- `nethack-c/upstream/src/muse.c:2938` through `:2946`: acidic non-tinned food applies stomach-acid damage with `rnd(15)` to non-acid-resistant monsters.
- `nethack-c/upstream/src/muse.c:2991` through `:2997`: tins qualify if openable and contain lizard or acidic meat; the `tinned` flag prevents the later stomach-acid damage branch.
- `nethack-c/upstream/include/monsters.h:137` through `:165`, `:601` through `:618`, `:1424` through `:1430`, `:1551` through `:1559`, `:1641` through `:1648`, `:1980` through `:1987`, `:2015` through `:2022`, `:2081` through `:2121`, and `:3055` through `:3062`: upstream `M1_ACID` species include acid blob, gelatinous cube, spotted jelly, ochre jelly, yellow dragons, green mold, black nagas, gray ooze, brown pudding, green slime, black pudding, and Juiblex.

## JS Changes

- `js/allmain.js`
  - Adds a local `ACIDIC_MONSTER_NAMES` set for the C `M1_ACID` species used by monster `munstone()` acidic-food detection.
  - Changes `monsterMunstoneItemIsAcidicFood()` from acid-blob-only name handling to the source-backed acidic species set while preserving explicit `corpsenm.acidic` metadata.
- `test/shop-billing-helpers.test.mjs`
  - Adds a green-mold corpse canary proving non-`acid blob` acidic corpses cure stoning, consume the corpse, apply `rnd(15)` stomach-acid damage, and avoid petrification.
  - Adds a green-mold tin canary proving acidic tins cure stoning without stomach-acid damage and leave the tin opener in monster inventory.

## Tests

- `production monster cockatrice egg target eats acidic corpse before petrifying`
- `production monster cockatrice egg target opens acidic tin without stomach damage`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster cockatrice egg" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster cockatrice egg|Kop cream pie forced iron bars|kobold dart aimed shot can clonk iron bars" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- `munstone()` tin recognition and opener eligibility for `kind: "tin:<species>"`, numeric-only opener metadata, animals, and cursed/welded wielded-weapon constraints are covered in audit 788.
- Cursed/greased monster-thrown egg misfire and sink/ordinary wall stop handling remain separate projectile slices.
