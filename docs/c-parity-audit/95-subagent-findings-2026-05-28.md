# Subagent Findings 95 - Stone-to-Flesh Vegetarian Corpstat Meatballs

## Implemented Slice: Vegetarian Statue and Figurine Meatballs

Implemented the narrow non-animation stone-to-flesh row for vegetarian statue and figurine monster identities.

C source:

- `nethack-c/upstream/include/objects.h:965`: figurines are static mineral tools.
- `nethack-c/upstream/include/objects.h:1620`: statues are static mineral rock objects.
- `nethack-c/upstream/src/zap.c:2002`: `stone_to_flesh_obj()` first requires mineral or gemstone material.
- `nethack-c/upstream/src/zap.c:2006`: eligible objects still run `obj_resists(obj, 2, 98)`.
- `nethack-c/upstream/src/zap.c:2017`: statues and figurines share the corpse/statue monster identity path.
- `nethack-c/upstream/src/zap.c:2019`: golem statue/figurine identities are checked before vegetarian meatball conversion.
- `nethack-c/upstream/src/zap.c:2021`: non-golem `vegetarian(ptr)` statue/figurine identities become `MEATBALL`.
- `nethack-c/upstream/include/mondata.h:232`: `vegan()` includes blobs, jellies, fungi, vortices, lights, non-stalker elementals, qualifying golems, and noncorporeal monsters.
- `nethack-c/upstream/include/mondata.h:239`: `vegetarian()` adds puddings except black pudding.
- `nethack-c/upstream/src/zap.c:2097`: meat conversion emits the stone-to-flesh smell message.

JS now mirrors just that meatball row:

- `js/cmd.js:12309`: statues and figurines are treated as static mineral objects for stone-to-flesh material gating.
- `js/cmd.js:12391`: local corpstat predicate excludes golems before vegetarian matching.
- `js/cmd.js:12397`: vegetarian matching covers the C monster-letter rows used by this slice.
- `js/cmd.js:12412`: the statue/figurine replacement gate requires mineral/gemstone material and vegetarian identity.
- `js/cmd.js:12429`: eligible objects reuse the existing resistance roll and meatball replacement path.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:1190`: test fixtures build C-shaped vegetarian `corpsenm` metadata.
- `test/shop-billing-helpers.test.mjs:3772`: carried cursed figurines become meatballs and lose figurine timer fields.
- `test/shop-billing-helpers.test.mjs:3800`: ordinary resistance leaves an eligible figurine unchanged without smell feedback.
- `test/shop-billing-helpers.test.mjs:4122`: downward stone-to-flesh turns a vegetarian statue into a meatball without dropping statue contents.

This deliberately excludes animation behavior. C handles golem identities by animation/flesh-golem transformation before the vegetarian branch, and nonvegetarian statue/figurine animation, failed-animation corpse fallback, content transfer, figurine timer stopping, and animation-specific shop billing remain open.

## Fresh Follow-Up Audits

### Burning-Oil Terrain Collateral

C source:

- `nethack-c/upstream/src/explode.c:255`: lit oil explosions map floor effects to `POT_OIL`.
- `nethack-c/upstream/src/explode.c:454`: explosion floor effects run before monster and hero damage.
- `nethack-c/upstream/src/zap.c:5162`: fiery floor effects delete webs with the burst-into-flames message.
- `nethack-c/upstream/src/zap.c:5173`: fiery floor effects melt ice through `melt_ice()`.
- `nethack-c/upstream/src/zap.c:5175`: fiery floor effects evaporate pools into gas and pits.
- `nethack-c/upstream/src/zap.c:5229`: fountains emit steam and dry up.
- `nethack-c/upstream/src/zap.c:5376`: lit oil uses blast-specific door wording.
- `nethack-c/upstream/src/explode.c:606`: fiery explosions burn away hero slime before inventory damage.

JS anchors:

- `js/cmd.js:13843`: current burning-oil blast collateral covers only floor-object burning.
- `js/fire_breath.js:219`: reusable fire-ray terrain logic already exists for webs.
- `js/fire_breath.js:327`: fire-ray ice handling exists but carries ray-specific wording and side effects.
- `js/fire_breath.js:386`: fountain dry-up helpers exist outside the oil blast path.
- `js/cmd.js:13826`: hero burning-oil damage lacks slime cleanup.

Smallest safe slice: add only web deletion plus hero slime cleanup to the burning-oil blast path. Keep ice, water, fountains, doors, and monster inventory ignition separate because they add terrain RNG, shop door damage, liquid/trap side effects, and ordering risks.

### Remote Projectile `ship_object()` Down-Gate

C source:

- `nethack-c/upstream/src/dothrow.c:1804`: ordinary thrown objects run `flooreffects()` before `ship_object()`.
- `nethack-c/upstream/src/dothrow.c:1819`: successful `ship_object()` consumes the landing path before placement.
- `nethack-c/upstream/src/dokick.c:1651`: `ship_object()` gates on `down_gate()`.
- `nethack-c/upstream/src/dokick.c:1659`: non-ladder non-ball/chain objects roll `rn2(3)` to fall through.
- `nethack-c/upstream/src/dokick.c:1695`: shop debt is charged before ship breakage.
- `nethack-c/upstream/src/dokick.c:1717`: fragile breakage runs before migration.
- `nethack-c/upstream/src/dokick.c:1752`: impacted floor piles are processed after projectile migration.
- `nethack-c/upstream/src/dothrow.c:2715`: thrown gold uses a separate ordering path.

JS anchors:

- `js/cmd.js:20947`: projectile landing currently handles breakage, floor effects, placement, shop, sale, and stacking without a `ship_object()` gate.
- `js/cmd.js:24300`: current floor effects only ship hole/trapdoor landings at the hero square.
- `js/cmd.js:21914`: shop-debt conversion helper already exists.
- `js/cmd.js:3327`: migration queue helpers already exist.
- `js/cmd.js:3365`: impacted floor-pile helper already exists.

Smallest safe slice: call a narrow remote, non-gold, hero-projectile helper after `earthFloorEffects()` and before placement. Cover seen hole/trapdoor destinations with a valid lower target, preserve the projectile fall roll and shop-debt-before-break ordering, and leave gold, kicked objects, monster-thrown objects, stairs, and ladders for later slices.

### Monster Diet Metadata

C source:

- `nethack-c/upstream/include/monflag.h:114`: `M1_CARNIVORE`.
- `nethack-c/upstream/include/monflag.h:115`: `M1_HERBIVORE`.
- `nethack-c/upstream/include/monflag.h:116`: `M1_OMNIVORE`, represented as both carnivore and herbivore bits.
- `nethack-c/upstream/include/monflag.h:118`: `M1_METALLIVORE`.
- `nethack-c/upstream/include/mondata.h:90`: `carnivorous()`, `herbivorous()`, and `metallivorous()` are direct flag tests.
- `nethack-c/upstream/src/dog.c:998`: pet food desirability keys off those diet helpers.
- `nethack-c/upstream/src/eat.c:1533`: tripe and corpse eating use diet flags.
- `nethack-c/upstream/src/zap.c:2097`: stone-to-flesh smell uses the hero monster form's carnivorous flag.

JS anchors:

- `js/monster_data.js`: generated monster rows do not currently carry canonical diet bits.
- `js/mklev.js:5360`: monster-row decoding is the natural place to attach local diet booleans.
- `js/mklev.js:575`: metallivore metadata is patched by hand today.
- `js/allmain.js:1849`: pet food uses name heuristics.
- `js/cmd.js:12449`: stone-to-flesh smell uses ad hoc polyself carnivore metadata.
- `js/cmd.js:1621`: several polyself extra forms lack C diet metadata.

Smallest safe slice: add a local `MONSTER_DIET_BY_NAME` overlay and attach `carnivorous`, `herbivorous`, and `metallivorous` booleans during monster lookup/decoding. Move one low-blast-radius caller first, preferably stone-to-flesh smell or tripe handling, and treat omnivores as both carnivorous and herbivorous.

## Remaining Notes

- Stone-to-flesh statue/figurine meatball conversion is now covered only for non-golem vegetarian identities.
- Remaining stone-to-flesh corpstat parity is animation and lifecycle work, not another meatball predicate expansion.
- Burning-oil terrain and remote projectile shipping both have compact next slices with existing JS helper pieces.
- Diet metadata should become shared monster metadata before pet food, tin, tripe, and smell callers grow more name heuristics.
