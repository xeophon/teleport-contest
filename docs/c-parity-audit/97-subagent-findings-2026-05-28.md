# Subagent Findings 97 - Burning-Oil Ice Melt

## Implemented Slice: Lit-Oil Explosion Ice Terrain

Implemented the next direct burning-oil terrain row: direct lit-oil potion explosions now melt ordinary ice squares during the 3x3 floor pass, before monster damage.

C source:

- `nethack-c/upstream/src/potion.c:1685`: lit oil hitting the hero routes to `explode_oil()`.
- `nethack-c/upstream/src/potion.c:1866`: lit oil hitting a monster routes to `explode_oil()`.
- `nethack-c/upstream/src/explode.c:974`: `explode_oil()` clears the burning object state and calls the fiery burning-oil explosion.
- `nethack-c/upstream/src/explode.c:478`: fiery explosions call `zap_over_floor()` for each affected square before monster damage.
- `nethack-c/upstream/src/zap.c:5173`: fire over ice calls `melt_ice(x, y, NULL)`.
- `nethack-c/upstream/src/zap.c:5040`: ordinary visible ice melt feedback is `The ice crackles and melts.`
- `nethack-c/upstream/src/zap.c:5048`: ordinary ice becomes `POOL` or `MOAT`.
- `nethack-c/upstream/src/zap.c:5054`: existing ice melt timers are stopped.
- `nethack-c/upstream/src/zap.c:5055`: trap/object ice effects and buried-object unearthing happen before visible melt feedback.
- `nethack-c/upstream/src/zap.c:5075`: melted-ice monster liquid effects run before later explosion monster damage.

JS now mirrors the ordinary ice row for direct lit-oil potion explosions:

- `js/cmd.js:13860`: burning-oil explosion terrain still iterates the 3x3 floor pass before monster and hero damage.
- `js/cmd.js:13865`: web deletion remains first, matching the fire `zap_over_floor()` order.
- `js/cmd.js:13869`: each blast square now calls `applyFireRayIceTerrain()`.
- `js/fire_breath.js:327`: the reused helper delegates to `meltIceAt()` and applies melted-ice monster liquid fallout.
- `js/ice.js:1031`: `meltIceAt()` handles terrain conversion, timer cleanup, trap/object ice effects, unearthing, redraw, and visible melt messages.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:17413`: direct lit-oil explosions melt adjacent blast ice before monster burning-oil damage, convert `ICED_POOL` ice to `POOL`, clear melt timer fields and the matching queued timer, preserve unrelated ice timers, and add no terrain RNG.

This still excludes fire over pools, fountains, doors, and hero-on-melted-ice `spoteffects()` cases. Those add liquid, steam, shop-door, and hero drowning/escape semantics and should remain separate terrain slices.

## Fresh Follow-Up Audits

### Remote Projectile `ship_object()` Down-Gate

C source:

- `nethack-c/upstream/src/dothrow.c:1780`: ordinary thrown objects run hard-landing `breaktest()` before floor effects.
- `nethack-c/upstream/src/dothrow.c:1804`: `flooreffects(obj, x, y, "fall")` runs next.
- `nethack-c/upstream/src/dothrow.c:1818`: `snuff_candle(obj)` happens before shipping.
- `nethack-c/upstream/src/dothrow.c:1819`: if there is no monster at the landing square, `ship_object()` can consume the path before placement.
- `nethack-c/upstream/src/dothrow.c:1824`: placement happens only after `ship_object()` declines.
- `nethack-c/upstream/src/dokick.c:1651`: `ship_object()` checks `down_gate(x, y)`.
- `nethack-c/upstream/src/dokick.c:1660`: non-ladder, non-ball/chain gates use `rn2(3)` to decide whether the object falls.
- `nethack-c/upstream/src/dokick.c:1718`: shipped objects get a second break check only after they actually fall.
- `nethack-c/upstream/src/dokick.c:1743`: surviving shipped objects migrate instead of being placed.
- `nethack-c/upstream/src/dokick.c:1943`: down gates include stairs, ladders, and seen holes/trapdoors.
- `nethack-c/upstream/src/dothrow.c:2715`: gold is intentionally different and ships before `flooreffects()`.

JS anchors:

- `js/cmd.js:20968`: projectile landing currently runs the shared landing helper.
- `js/cmd.js:20990`: JS runs `earthFloorEffects(..., "fall")`.
- `js/cmd.js:21001`: JS immediately places the object, so the post-floor `ship_object()` gate is missing.
- `js/cmd.js:3317`: existing gate text support covers seen holes/trapdoors.
- `js/cmd.js:3327`: queued impact-drop migration support already exists.
- `js/cmd.js:21935`: shipped-object shop debt support already exists.

Smallest safe slice: add a post-`earthFloorEffects()` helper in `landProjectileObjectWithShopHandling()` for non-gold, non-monster hero projectiles. Cover seen `HOLE`/`TRAPDOOR` first with the C `rn2(3)` fall gate, visible transit message, shop debt conversion, second break check, and migration queueing. Keep gold, stairs/ladders, impacted floor piles, and monster-thrown ordering separate.

### Stone-to-Flesh Figurine Animation

C source:

- `nethack-c/upstream/src/zap.c:1993`: `stone_to_flesh_obj()` gates on mineral/gemstone material and object resistance.
- `nethack-c/upstream/src/zap.c:2017`: statues and figurines enter the corpstat branch.
- `nethack-c/upstream/src/zap.c:2019`: non-flesh golem identities set the target to flesh golem.
- `nethack-c/upstream/src/zap.c:2030`: figurines animate through `makemon(ptr, x, y, NO_MINVENT | MM_NOMSG)`.
- `nethack-c/upstream/src/zap.c:2035`: successful animation charges costly spots.
- `nethack-c/upstream/src/zap.c:2041`: successful animation stops figurine timers.
- `nethack-c/upstream/src/zap.c:2043`: carried figurines use `useup()`, floor figurines use `delobj()`.
- `nethack-c/upstream/src/zap.c:2047`: visible messages are `The figurine animates!` or `The figurine turns to flesh and animates!`.

JS anchors:

- `js/cmd.js:12308`: stone-to-flesh material logic treats figurines as mineral.
- `js/cmd.js:12391`: golem and vegetarian predicates already exist.
- `js/cmd.js:12419`: current replacement logic only covers meatball replacement, not animation.
- `js/cmd.js:12498`: self-cast inventory handling is still synchronous replacement logic.
- `js/figurine.js:98`: `makeFigurineFamiliar()` is not C-equivalent for this spell path because it applies familiar behavior.
- `js/mklev.js:6882`: JS `makemon()` already relocates away from the hero square.

Smallest safe slice: implement non-shop carried self-cast figurine animation only. Detect resistant-passing carried figurines that are golems or non-vegetarians, call `makemon()` with `NO_MINVENT | MM_NOMSG`, stop transform timers, remove the figurine, and emit the C animation message. Defer floor figurines, billing, statue contents, and failed corpse fallback.

### Polyself Diet Metadata Overlay

C source:

- `nethack-c/upstream/include/monflag.h:114`: diet bits are `M1_CARNIVORE`, `M1_HERBIVORE`, `M1_OMNIVORE`, and `M1_METALLIVORE`.
- `nethack-c/upstream/include/mondata.h:90`: `M1_OMNIVORE` satisfies both `carnivorous()` and `herbivorous()`.
- `nethack-c/upstream/src/zap.c:1991`: stone-to-flesh smell checks role, vegetarian conduct, and `carnivorous(gy.youmonst.data)`.
- `nethack-c/upstream/src/eat.c:2131`: tripe is surprisingly good for carnivorous non-humanoid polyself forms.
- `nethack-c/upstream/src/eat.c:1528`: metallivorous forms bite tins open directly.
- `nethack-c/upstream/src/eat.c:1728`: metallivorous tin eating adds metal nutrition.
- `nethack-c/upstream/src/eat.c:3579`: broader metallivorous `#eat` non-food prompt support is a larger slice.

JS anchors:

- `js/cmd.js:68`: current polyself accessor reads `_polyself_form` directly.
- `js/cmd.js:9986`: `polyselfFormByName()` copies raw monster data into polyself forms.
- `js/cmd.js:12449`: stone-to-flesh smell uses ad hoc `form.carnivorous`.
- `js/cmd.js:15276`: tripe uses ad hoc `form.carnivorous` and `form.humanoid === false`.
- `js/cmd.js:17207`: tin handling uses ad hoc `form.metallivorous`.
- `js/mklev.js:5395`: generated monster decoding currently supplies only limited diet metadata.

Smallest safe slice: add a local read-only diet overlay for polyself callers. Preserve explicit form fields as overrides, but let names like `wolf`, `red dragon`, `rock mole`, `rust monster`, `xorn`, `pony`, `horse`, `warhorse`, `dwarf`, and orc forms supply C diet booleans for stone-to-flesh smell, tripe, and tin handling. Leave non-food metallivore `#eat` selection for later.

## Remaining Notes

- Burning-oil floor objects, webs, hero slime cleanup, and ordinary ice melting are now covered for direct lit-oil potion explosions.
- Remaining burning-oil terrain should proceed as separate water, fountain, door, and hero-on-liquid fallout slices.
- The remote projectile down-gate, carried figurine animation, and polyself diet overlay remain good near-term targets because their audits now have local JS helper anchors.
