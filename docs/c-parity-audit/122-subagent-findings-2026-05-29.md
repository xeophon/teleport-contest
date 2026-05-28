# Subagent Findings 122 - Pet Food Meat Classification Batch

## Implemented Slice: Stone-To-Flesh Meat Is Dog Food For Carnivores

Covered the C `dogfood()` meat branch for stone-to-flesh meat items. Carnivorous pets now treat meatballs, meat rings, meat sticks, and enormous meatballs as `DOGFOOD`, including objects identified by concrete `otyp` instead of only by JS kind text. Non-carnivores still receive the existing `MANFOOD` result for this branch. The slice also lets explicit monster diet flags drive the carnivore/herbivore predicate and preserves the local dog/cat-style fallbacks with a C-backed carnivore name set for common tame forms such as wolves.

C source:

- `nethack-c/upstream/src/dog.c:990`: `dogfood()` classifies pet food quality.
- `nethack-c/upstream/src/dog.c:997`: C derives `carni` and `herbi` from monster flags.
- `nethack-c/upstream/src/dog.c:1033`: pets with neither carnivore nor herbivore bits return `APPORT` or `UNDEF` before food-specific eating branches.
- `nethack-c/upstream/src/dog.c:1054`: `TRIPE_RATION`, `MEATBALL`, `MEAT_RING`, `MEAT_STICK`, and `ENORMOUS_MEATBALL` share the same meat branch.
- `nethack-c/upstream/src/dog.c:1060`: that branch returns `carni ? DOGFOOD : MANFOOD`.
- `nethack-c/upstream/include/mondata.h:90`: `carnivorous()` and `herbivorous()` read the monster diet bits.
- `nethack-c/upstream/include/monflag.h:113`: `M1_CARNIVORE`, `M1_HERBIVORE`, and `M1_OMNIVORE` are the relevant diet flags.
- `nethack-c/upstream/include/objects.h:1045`: meatballs, meat sticks, and meat rings are marked as stone-to-flesh-created foods.
- `nethack-c/upstream/src/zap.c:2014`: stone-to-flesh creates the meatball, meat ring, meat stick, and enormous meatball object types from eligible stone objects.

Subagent findings:

- The smallest source-backed pet-food slice was the `dog.c` meat branch, not broader pet AI or full object-registry work.
- Current JS already had a tripe/food-roll branch in `dogFood()` but did not include the full stone-to-flesh meat family.
- Matching by JS `kind` alone was weaker than C because C switches on `obj->otyp`; the implemented branch now accepts both kind text and concrete meat object type numbers.
- JS monster data still lacks a complete generated `M1_*` diet model. This slice accepts explicit `carnivorous`/`carnivore` and `herbivorous`/`herbivore` fields and adds a local C-backed carnivore name set for common pet forms, while leaving full monster-flag registry generation for a later object/monster metadata pass.
- Ghoul-specific `dogfood()` handling remains separate: C ghouls never eat stone-to-flesh meat and have special old-corpse/stale-egg preferences.

Covered JS behavior:

- `js/allmain.js:1846`: added a C-backed carnivorous pet name set for common carnivore pet forms, including dogs, cats, wolves, dragons, carnivorous apes, aquatic carnivores, and were-beasts.
- `js/allmain.js:1869`: added concrete meat `otyp` matching for meatballs, meat rings, meat sticks, and enormous meatballs.
- `js/allmain.js:1878`: added small diet helpers so explicit monster diet flags participate in `dogFood()` classification.
- `js/allmain.js:1915`: the food branch now returns `DOGFOOD` for carnivores and `MANFOOD` otherwise when the item is tripe or one of the stone-to-flesh meat types.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:9006`: dog and wolf pets both step onto and eat meatball, meat ring, meat stick, enormous meatball, and an `otyp`-only meatball representation.
- `test/shop-billing-helpers.test.mjs:9080`: a custom pet with only the explicit `carnivorous` data flag eats a stone-to-flesh meat stick, proving the C-shaped flag predicate path is active.

Verification:

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "stone-to-flesh meat" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`844/844 passing`)
- `npm run score` (`44/44 passing`)
- `git diff --check`

## Deferred Compact Candidates

- Floor figurine stone-to-flesh animation: `nethack-c/upstream/src/zap.c:1993` through `zap.c:2047` handles material/resistance gates, direct `makemon(..., NO_MINVENT|MM_NOMSG)`, timer stop, floor deletion, visible animation wording, and a shop-billed `stolen_value()` branch. JS still has only the carried animation slice and synchronous floor replacement.
- Thrown-gold stairs/ladders/special-stairs down-gates: `nethack-c/upstream/src/dothrow.c:2715` calls `ship_object()` before placement/floor effects/shop donation/stacking; `nethack-c/upstream/src/dokick.c:1943` allows ordinary down stairs, ladders, special stairs, branch stairs, and seen holes/trapdoors. JS currently covers remote seen holes/trapdoors only.
- Ordinary non-petrifying corpse `toss_up()`: `nethack-c/upstream/src/dothrow.c:1588` routes upward throws to `toss_up()`, and `dothrow.c:1341` through `dothrow.c:1420` covers falling corpse damage, hard-helmet mitigation, landing before HP loss, and nonbreaking corpse behavior. JS currently handles only explicit upward petrifying-corpse slices.
- Destroyed ice-box survivor timers: `nethack-c/upstream/src/lock.c:199` converts surviving ice-box corpse age and restarts corpse timeout after a shattered ice box spills contents; `nethack-c/upstream/src/mkobj.c:2364` and `mkobj.c:2478` then apply final placement ice effects. This should stay helper-level unless a separate source-backed command path makes ice boxes forceable.
- Lit-oil fountain terrain in direct `potionhit()`: `nethack-c/upstream/src/potion.c:1866` routes lit oil direct hits through `explode_oil()`, and `nethack-c/upstream/src/zap.c:5229` applies fire-over-fountain gas/steam/dry-up behavior during the blast floor pass. JS burning-oil blast terrain handles webs, ice, water, pools, and floor objects but not fountains yet.
