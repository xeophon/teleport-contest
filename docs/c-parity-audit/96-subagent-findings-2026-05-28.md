# Subagent Findings 96 - Burning-Oil Webs and Slime Cleanup

## Implemented Slice: Web Deletion and Hero Unsliming

Implemented the next narrow direct lit-oil explosion terrain row: fire-hit webs are deleted across the 3x3 blast before monster damage, and a hero caught in fiery burning oil has green slime burned away before inventory fire damage.

C source:

- `nethack-c/upstream/src/explode.c:454`: explosions apply floor effects before monster and hero damage.
- `nethack-c/upstream/src/explode.c:481`: each affected square calls `zap_over_floor()` before monster handling.
- `nethack-c/upstream/src/zap.c:5165`: fiery floor effects delete `WEB` traps.
- `nethack-c/upstream/src/zap.c:5168`: visible web deletion uses `Norep("A web bursts into flames!")`.
- `nethack-c/upstream/src/zap.c:5169`: `delfloortrap()` removes the web before other fire floor effects continue.
- `nethack-c/upstream/src/explode.c:590`: hero injury is processed after floor and monster effects.
- `nethack-c/upstream/src/explode.c:602`: the hero first gets the caught-in-explosion message.
- `nethack-c/upstream/src/explode.c:606`: fire explosions call `burn_away_slime()` before property damage.
- `nethack-c/upstream/src/trap.c:6668`: deleting a trap also clears the hero's matching trap state.
- `nethack-c/upstream/src/timeout.c:448`: `burn_away_slime()` clears sliming with `The slime that covers you is burned away!`.

JS now mirrors those rows for direct lit-oil potion explosions:

- `js/cmd.js:13829`: hero caught-in-burning-oil feedback is emitted before unsliming.
- `js/cmd.js:13830`: hero slime cleanup now runs before `fireDamageInventory()`.
- `js/cmd.js:13849`: `burnAwayHeroSlime()` clears JS sliming state and emits the C message.
- `js/cmd.js:13860`: the burning-oil 3x3 floor pass remains ordered before monster and hero damage.
- `js/cmd.js:13865`: each blast square now applies the existing fire-web deletion helper before floor-object burning.
- `js/fire_breath.js:219`: reused web helper already deletes traps, clears trapped hero/monster state, redraws visible squares, and suppresses repeated web messages.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:17413`: direct lit-oil explosions remove center and adjacent visible webs, clear the trapped monster flag, suppress duplicate visible web messages, and do not add RNG.
- `test/shop-billing-helpers.test.mjs:17447`: direct lit-oil explosions clear the hero's web trap state when the blast burns away the web under the hero.
- `test/shop-billing-helpers.test.mjs:17476`: unseen webs are removed silently while the blast still uses unseen explosion feedback.
- `test/shop-billing-helpers.test.mjs:17595`: adjacent lit-oil explosions burn away hero slime after the caught-in-oil message and before inventory fire handling.

This still deliberately excludes the wider fire terrain matrix. Ice melting, pool evaporation, fountain steam/dryup, door burning, and monster inventory light-source ignition have additional terrain RNG, shop-damage, liquid/trap, and armor-ordering risks.

## Fresh Follow-Up Audits

### Remaining Burning-Oil Terrain Rows

C source:

- `nethack-c/upstream/src/zap.c:5173`: fire calls `melt_ice()` for ice terrain.
- `nethack-c/upstream/src/zap.c:5175`: fire evaporates pools into gas and pits.
- `nethack-c/upstream/src/zap.c:5229`: fire creates fountain steam and calls `dryup()`.
- `nethack-c/upstream/src/zap.c:5376`: lit oil uses blast-specific door wording and can damage shop doors.
- `nethack-c/upstream/src/explode.c:511`: monster inventory fire order is destroy items, burn armor, then ignite remaining light sources.

JS anchors:

- `js/fire_breath.js:327`: fire-ray ice handling exists but includes ray-specific wording and wider melt side effects.
- `js/fire_breath.js:342`: fire-ray water handling exists but adds gas RNG and pool state transitions.
- `js/fire_breath.js:386`: fountain helpers exist but need blast-specific ordering and messages.
- `js/cmd.js:13803`: burning-oil monster damage destroys fire-vulnerable inventory but does not yet ignite surviving light sources.

Smallest safe next terrain slice: keep ice/water/fountains/doors separate, and prefer one terrain type at a time because each adds different RNG and shop/level side effects.

### Remote Projectile `ship_object()` Down-Gate

C source:

- `nethack-c/upstream/src/dothrow.c:1804`: ordinary thrown objects run `flooreffects()` before `ship_object()`.
- `nethack-c/upstream/src/dothrow.c:1819`: successful `ship_object()` consumes the landing path before placement.
- `nethack-c/upstream/src/dokick.c:1651`: `ship_object()` gates on `down_gate()`.
- `nethack-c/upstream/src/dokick.c:1659`: non-ladder non-ball/chain objects roll `rn2(3)` to fall through.
- `nethack-c/upstream/src/dokick.c:1695`: shop debt is charged before ship breakage.
- `nethack-c/upstream/src/dokick.c:1752`: impacted floor piles are processed after projectile migration.

JS anchors:

- `js/cmd.js:20947`: projectile landing still lacks a remote `ship_object()` gate before placement.
- `js/cmd.js:24300`: current floor effects only ship hole/trapdoor landings at the hero square.
- `js/cmd.js:21914`: shop-debt conversion helper already exists.
- `js/cmd.js:3327`: migration queue helpers already exist.
- `js/cmd.js:3365`: impacted floor-pile helper already exists.

Smallest safe slice remains a remote, non-gold, hero-projectile helper after `earthFloorEffects()` and before placement, covering seen hole/trapdoor destinations with a valid lower target.

### Stone-to-Flesh Golem Figurine Animation

C source:

- `nethack-c/upstream/src/zap.c:2019`: golem statue/figurine identities set `golem_xform` before the vegetarian meatball branch.
- `nethack-c/upstream/src/zap.c:2030`: figurines call `makemon()` rather than `poly_obj()` meatball replacement.
- `nethack-c/upstream/src/zap.c:2031`: non-flesh golem figurines animate as flesh golems.
- `nethack-c/upstream/src/zap.c:2035`: successful figurine animation handles costly spots, stops object timers, deletes the figurine, and consumes it.
- `nethack-c/upstream/src/zap.c:2058`: failed animation falls back to no-op or corpse conversion depending on monster eligibility.
- `nethack-c/upstream/src/makemon.c:1147`: `makemon()` near the hero may relocate to an adjacent legal square.

JS anchors:

- `js/cmd.js:12391`: stone-to-flesh golem detection already exists for the meatball exclusion.
- `js/cmd.js:12419`: stone-to-flesh replacement dispatch still has no animation return path.
- `js/cmd.js:12498`: self-cast stone-to-flesh inventory handling is currently synchronous replacement logic.
- `js/figurine.js:98`: `makeFigurineFamiliar()` is not suitable for this C row because it creates familiar/tameness behavior.
- `js/allmain.js:3670`: ordinary figurine timeout processing already removes/reschedules figurines, but spell animation is a separate path.

Smallest safe slice: implement only non-shop self-cast stone-to-flesh on a carried golem figurine. Create a flesh golem near the hero with `makemon(..., NO_MINVENT | MM_NOMSG)`, stop the figurine timer, remove the figurine from inventory, and emit the animation message. Defer statue contents, billing, failed corpse fallback, and shop cases.

### Polyself Diet Metadata Overlay

C source:

- `nethack-c/upstream/include/monflag.h:114`: diet bits are `M1_CARNIVORE`, `M1_HERBIVORE`, `M1_OMNIVORE`, and `M1_METALLIVORE`.
- `nethack-c/upstream/include/mondata.h:90`: `M1_OMNIVORE` satisfies both `carnivorous()` and `herbivorous()` through direct bit tests.
- `nethack-c/upstream/src/zap.c:2097`: stone-to-flesh smell uses role, vegetarian conduct, and `carnivorous(gy.youmonst.data)`.
- `nethack-c/upstream/src/eat.c:2131`: tripe uses `carnivorous(current form) && !humanoid(current form)`.
- `nethack-c/upstream/src/eat.c:1528`: metallivorous polyself forms bite open tins directly.
- `nethack-c/upstream/src/eat.c:1728`: metallivorous tin eating gives metal nutrition.
- `nethack-c/upstream/src/dog.c:995`: broad pet `dogfood()` diet parity is larger and should remain separate.

JS anchors:

- `js/monster_data.js:1`: generated monster tuples have no diet fields today.
- `js/mklev.js:5360`: monster tuple decoding currently lacks carnivore/herbivore diet parity.
- `js/cmd.js:1621`: `POLYSELF_EXTRA_FORMS` shadows some generated rows without diet metadata.
- `js/cmd.js:9986`: `polyselfFormByName()` is a narrow local point to decorate polyself forms.
- `js/cmd.js:12449`: stone-to-flesh smell is already a polyself-local diet consumer.
- `js/cmd.js:15255`: tripe messages are another local polyself diet consumer.
- `js/cmd.js:17186`: tin handling already checks metallivorous polyself state.
- `js/allmain.js:1843`: pet food remains name-heuristic and should not be bundled with the first metadata slice.

Smallest safe slice: add a local `decoratePolyselfDiet(form)` near `polyselfFormByName()`, keyed by lowercase monster name, returning copied forms with `carnivorous`, `herbivorous`, `metallivorous`, and `humanoid` fields. Cover dog/cat/dragon/werecreature carnivores, dwarf/orc omnivore humanoids, and rock mole/rust monster/xorn metallivores first, with lichen and golems as negative controls.

## Remaining Notes

- Burning-oil floor objects, visible webs, and hero slime cleanup are now covered for direct lit-oil potion explosions.
- Remaining burning-oil terrain should proceed by terrain type, not by a broad `zap_over_floor()` rewrite.
- The projectile down-gate and diet metadata slices still have enough local helper support to be good near-term targets.
