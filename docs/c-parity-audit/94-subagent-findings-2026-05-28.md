# Subagent Findings 94 - Lit Oil Explosion Floor Collateral

## Implemented Slice: Burning-Oil Floor Object Damage

Implemented the narrow floor-object collateral row for direct lit-oil potion explosions.

C source:

- `nethack-c/upstream/src/potion.c:1685`: lit oil hitting the hero calls `explode_oil()`.
- `nethack-c/upstream/src/potion.c:1866`: lit oil hitting a monster calls `explode_oil()`.
- `nethack-c/upstream/src/explode.c:454`: explosions apply floor effects before monster and hero damage.
- `nethack-c/upstream/src/explode.c:481`: each affected blast square calls `zap_over_floor()`.
- `nethack-c/upstream/src/zap.c:5489`: fiery floor handling calls `burn_floor_objects(x, y, FALSE, type > 0)`.
- `nethack-c/upstream/src/zap.c:4610`: eligible burnable floor objects are scrolls, spellbooks, and globs of green slime.
- `nethack-c/upstream/src/zap.c:4618`: each eligible object unit has a `!rn2(3)` destruction chance.
- `nethack-c/upstream/src/zap.c:4635`: hero-caused floor fire routes through `useupf()` shop billing.
- `nethack-c/upstream/src/zap.c:5490`: visible burned squares produce the puff-of-smoke feedback.

JS now mirrors the floor-object part of that path:

- `js/cmd.js:13812`: `burnFloorObjectsFromBurningOilExplosion()` walks the 3x3 blast area.
- `js/cmd.js:13817`: each square uses the existing `burnFloorObjectsByFire()` helper with `heroCaused: true`.
- `js/cmd.js:13819`: per-object burn feedback is disabled, matching C's `give_feedback == FALSE`.
- `js/cmd.js:13822`: visible burned squares produce the smoke feedback.
- `js/cmd.js:13838`: floor-object fire runs before monster and hero damage in `explodeBurningOilPotion()`.
- `js/cmd.js:8216`: `burnFloorObjectsByFire()` already implements the scroll, spellbook, green-slime, `rn2(3)`, ignition, redraw, and hero-caused shop billing behavior.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:17266`: a direct lit-oil hit burns center and adjacent spellbooks before monster damage.
- `test/shop-billing-helpers.test.mjs:17301`: hero-caused burning-oil floor collateral bills burned shop-floor stock through used-up billing.

This deliberately does not broaden the explosion terrain pipeline. Webs, ice, water, fountains, doors, monster inventory ignition gaps, and hero sliming cleanup remain separate `zap_over_floor()`/explosion work.

## Fresh Follow-Up Audits

### Stone-to-Flesh Statue and Figurine Rows

C source:

- `nethack-c/upstream/include/objects.h:965`: figurines are mineral tools.
- `nethack-c/upstream/include/objects.h:1620`: statues are mineral rock-class containers.
- `nethack-c/upstream/src/mkobj.c:1040`: random figurines choose a harder monster and avoid ordinary humans.
- `nethack-c/upstream/src/mkobj.c:1151`: statue initialization chooses a corpse monster and may add a spellbook.
- `nethack-c/upstream/src/mkobj.c:1212`: statue and figurine initialization share monster identity fields.
- `nethack-c/upstream/src/objnam.c:5232`: figurine wishes reject unique, ordinary human, non-were, and mail-daemon requests.
- `nethack-c/upstream/src/objnam.c:5241`: statue wishes accept requested monster identity.
- `nethack-c/upstream/src/zap.c:2002`: stone-to-flesh first gates mineral/gemstone objects.
- `nethack-c/upstream/src/zap.c:2006`: `obj_resists(obj, 2, 98)` can block transformation.
- `nethack-c/upstream/src/zap.c:2017`: statue and figurine rows are handled after boulders.
- `nethack-c/upstream/src/zap.c:2021`: vegetarian or non-flesh statue/figurine species become meatballs.
- `nethack-c/upstream/src/zap.c:2027`: eligible statues animate through `animate_statue(..., ANIMATE_SPELL)`.
- `nethack-c/upstream/src/zap.c:2030`: eligible figurines create a monster with `makemon(..., NO_MINVENT|MM_NOMSG)`.
- `nethack-c/upstream/src/zap.c:2035`: figurine animation bills, stops timers, and consumes the figurine.
- `nethack-c/upstream/src/zap.c:2058`: failed animation can fall back to corpse conversion.
- `nethack-c/upstream/src/zap.c:2064`: statue contents are placed on the floor with bypass.
- `nethack-c/upstream/src/zap.c:2069`: fallback object conversion uses `poly_obj()`.

JS anchors:

- `js/cmd.js:12390`: current stone-to-flesh paths cover wands, rings, boulders, and gems, but not statues or figurines.
- `js/cmd.js:12381`: covered object rows already use the C-shaped resistance roll.
- `js/cmd.js:12498`: downward floor replacement paths already cover local shop/billing and replacement shape.
- `js/figurine.js:19`: figurines already have local transformation timers.
- `js/cmd.js:16247`: statue animation exists for statue traps and wand-of-striking.
- `test/wishing.test.mjs:1403`: figurine wish restrictions are covered.
- `test/wishing.test.mjs:1490`: statue wish monster binding is covered.

Smallest safe slice: add only the non-animation row first. If a statue or figurine has a vegetarian or non-flesh monster identity, stone-to-flesh should turn it into a meatball through the existing inventory/floor replacement paths after the mineral and resistance gates. Defer live animation, golem statue behavior, failed-animation corpse fallback, contents transfer, figurine timer stopping, and animation-specific shop billing.

### Monster Diet Metadata

C source:

- `nethack-c/upstream/include/monflag.h:114`: `M1_CARNIVORE`.
- `nethack-c/upstream/include/monflag.h:115`: `M1_HERBIVORE`.
- `nethack-c/upstream/include/monflag.h:116`: `M1_OMNIVORE`.
- `nethack-c/upstream/include/monflag.h:118`: `M1_METALLIVORE`.
- `nethack-c/upstream/include/mondata.h:90`: `carnivorous()`.
- `nethack-c/upstream/include/mondata.h:91`: `herbivorous()`.
- `nethack-c/upstream/include/mondata.h:92`: `metallivorous()`.
- `nethack-c/upstream/src/dog.c:995`: pet food desirability keys off diet helpers.
- `nethack-c/upstream/src/eat.c:1533`: tripe and corpse eating use monster diet flags.
- `nethack-c/upstream/src/zap.c:2097`: stone-to-flesh smell uses `carnivorous(gy.youmonst.data)`.

JS anchors:

- `js/monster_data.js`: generated monster rows currently lack canonical diet bits.
- `js/mklev.js:5360`: monster-row decoding can attach diet booleans.
- `js/mklev.js:5395`: metallivorous status is currently patched by hand.
- `js/allmain.js:1843`: pet food still uses name heuristics.
- `js/cmd.js:12418`: stone-to-flesh smell relies on ad hoc polyself carnivore metadata.
- `js/allmain.js:2160`: metallivore food handling is another local diet caller.

Smallest safe slice: add a generated diet field to monster rows and decode C-shaped `carnivorous`, `herbivorous`, and `metallivorous` booleans. Then move one caller, preferably pet food desirability or the stone-to-flesh smell helper, from name heuristics to metadata. Treat `M1_OMNIVORE` as both carnivorous and herbivorous.

### Projectile Floor-Pile Impact Loss

C source:

- `nethack-c/upstream/src/dokick.c:1639`: `ship_object()` handles object travel through holes and trapdoors.
- `nethack-c/upstream/src/dokick.c:1665`: existing floor piles are detected before the projectile drop.
- `nethack-c/upstream/src/dokick.c:1687`: even when the projectile itself does not fall, an impacted pile can be processed.
- `nethack-c/upstream/src/dokick.c:1695`: unpaid projectile/shop-floor debt is converted before migration.
- `nethack-c/upstream/src/dokick.c:1717`: fragile breakage runs after shop debt and before migration.
- `nethack-c/upstream/src/dokick.c:1743`: falling projectiles are queued for migration.
- `nethack-c/upstream/src/dokick.c:1752`: impacted floor piles are processed after projectile migration.
- `nethack-c/upstream/src/dokick.c:1511`: `impact_drop()` iterates pile objects.
- `nethack-c/upstream/src/dokick.c:1559`: pile objects get their own fall rolls.
- `nethack-c/upstream/src/dokick.c:1573`: falling shop-owned pile objects are billed.
- `nethack-c/upstream/src/dokick.c:1586`: falling pile objects are queued for migration.
- `nethack-c/upstream/src/dothrow.c:1804`: `dothrow()` runs `flooreffects()` before `ship_object()`.

JS anchors:

- `js/cmd.js:20898`: `landProjectileObjectWithShopHandling()` handles current hard break, floor effects, shop return/debt, sale, stacking, and placement.
- `js/cmd.js:20920`: floor effects already run before placement.
- `js/cmd.js:20931`: placement currently happens without `ship_object()` pile impact handling.
- `js/cmd.js:3365`: `impactDropFloorObjects()` exists for other contexts but is not wired to projectile landing.
- `js/cmd.js:21865`: shop-debt conversion helper shape already exists.

Smallest safe slice: after the remote non-gold projectile down-gate lands, add pile-impact loss for existing floor objects on the destination square. Preserve C ordering: projectile fall roll first, projectile shop debt and breakage before migration, then pile impact rolls and pile billing. Exclude gold, kicked objects, monster-thrown objects, and broader migration message fidelity until the first remote projectile gate is in place.

### Forced Chest Mimics and Ice-Box Corpse Timers

C source:

- `nethack-c/upstream/src/lock.c:184`: destroyed boxes extract each content object.
- `nethack-c/upstream/src/lock.c:186`: each content object gets a `rn2(3)` destruction roll and potions are always destroyed.
- `nethack-c/upstream/src/lock.c:199`: surviving ice-box corpses get special thaw handling.
- `nethack-c/upstream/src/lock.c:200`: surviving corpse age is converted with `moves - age`.
- `nethack-c/upstream/src/lock.c:201`: surviving corpse timeout is restarted.
- `nethack-c/upstream/include/obj.h:338`: `Is_box` is only large boxes and chests, not ice boxes.
- `nethack-c/upstream/src/lock.c:717`: `#force` only scans `Is_box` containers.
- `nethack-c/upstream/src/mon.c:4385`: blunt force wakes sleeping nearby monsters.
- `nethack-c/upstream/src/mon.c:4409`: `wake_nearby()` does not call `seemimic()`.

JS anchors:

- `js/cmd.js:9023`: `wakeNearbyFromForceLock()`.
- `js/cmd.js:9032`: visible sleeping monsters get wake messages.
- `js/cmd.js:9035`: non-unique wait masks are cleared.
- `js/cmd.js:9041`: nearby buried zombies are disturbed.
- `js/cmd.js:9075`: forceable boxes already exclude ice boxes.
- `js/cmd.js:9327`: destroyed-box content loop has per-content rolls.
- `js/cmd.js:9336`: stack-survivor placement does not yet special-case ice-box corpse thaw.
- `js/ice.js:221`: `startCorpseTimeout()`.
- `js/ice.js:267`: ordinary `removedFromIcebox()` also sets pickup-style fields that C's lock path does not.

Smallest safe slice: add a visible object/furniture mimic wake test showing blunt `#force` wakes the monster but preserves its disguise, then add a helper-level ice-box survivor corpse test for the destroyed-container content placement helper. Do not make real `#force` target ice boxes; C excludes them from `Is_box`.

## Remaining Notes

- Burning-oil floor-object collateral is covered only for direct lit-oil potion explosions. Broader `explode()` terrain effects remain open.
- Stone-to-flesh statue and figurine work should start with the meatball row before touching animation or content-transfer lifecycles.
- Diet metadata remains a good registry cleanup because it removes several fragile name heuristics at once.
