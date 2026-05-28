# Subagent Findings 98 - Polyself Diet Overlay

## Implemented Slice: Polyself Diet Metadata For Food Callers

Implemented a compact read-only diet overlay for current polyself food callers. Name-only polyself forms now pick up C diet flags for stone-to-flesh smell wording, tripe first-bite behavior, and metallivorous tin handling without mutating `_polyself_form`.

C source:

- `nethack-c/upstream/include/monflag.h:114`: diet bits are `M1_CARNIVORE`, `M1_HERBIVORE`, `M1_OMNIVORE`, and `M1_METALLIVORE`.
- `nethack-c/upstream/include/mondata.h:90`: `M1_OMNIVORE` satisfies both `carnivorous()` and `herbivorous()`.
- `nethack-c/upstream/src/zap.c:2097`: stone-to-flesh smell checks `carnivorous(gy.youmonst.data)` after role and vegetarian-conduct gates.
- `nethack-c/upstream/src/eat.c:2131`: tripe is surprisingly good for carnivorous non-humanoid polyself forms.
- `nethack-c/upstream/src/eat.c:1528`: metallivorous forms bite directly into tins.
- `nethack-c/upstream/src/eat.c:1728`: metallivorous tin eating adds metal nutrition.
- `nethack-c/upstream/src/eat.c:3579`: broader non-food metallivorous `#eat` is a separate caller surface.

JS now mirrors the diet metadata needed by the covered callers:

- `js/cmd.js:72`: `POLYSELF_DIET_OVERLAY` lowercases form names and maps C diet groups without changing the stored form.
- `js/cmd.js:104`: `polyselfFormWithDiet()` merges overlay data with explicit form fields, preserving explicit form overrides.
- `js/cmd.js:12494`: stone-to-flesh smell now reads the diet-enriched form.
- `js/cmd.js:15327`: tripe now reads diet-enriched carnivore and humanoid flags.
- `js/cmd.js:17258`: metallivorous tin handling now reads diet-enriched metallivore flags.

Covered diet groups:

- Carnivores: dog/cat/wolf lines, adult and baby dragons, carnivorous ape, aquatic carnivores, and werebeasts.
- Omnivores: dwarf and orc lines, with both carnivorous and herbivorous flags plus humanoid tripe handling.
- Herbivores: pony, horse, and warhorse.
- Metallivores: rock mole, rust monster, and xorn.

Regression coverage:

- `test/shop-billing-helpers.test.mjs:3626`: name-only `wolf` and omnivorous `dwarf` forms get delicious stone-to-flesh smell after vegetarian conduct is broken, while Monk wording stays on the odor message.
- `test/shop-billing-helpers.test.mjs:1076`: the rock-mole metallivore helper no longer carries an explicit `metallivorous` field, so existing tin tests exercise the overlay.
- `test/shop-billing-helpers.test.mjs:7541`: name-only rust monster and xorn forms eat empty tins through the overlay.
- `test/shop-billing-helpers.test.mjs:8145`: wolf tripe uses the carnivorous non-humanoid branch, while orc-captain tripe stays on the humanoid orc wording.

This slice deliberately leaves pet-food preferences and non-food metallivorous `#eat` for later, because those are distinct callers with different prompt and selection behavior.

## Fresh Follow-Up Audits

### Remote Projectile `ship_object()` Down-Gate

C source:

- `nethack-c/upstream/src/dothrow.c:1804`: hero projectile landing runs `flooreffects(obj, x, y, "fall")` before the post-floor shipping gate.
- `nethack-c/upstream/src/dothrow.c:1819`: if no monster occupies the landing square, C calls `ship_object()` before placement, impact, and shop handling.
- `nethack-c/upstream/src/dokick.c:1657`: `ship_object()` checks `down_gate(x, y)` and consumes the fall/stay roll for non-ladder gates.
- `nethack-c/upstream/src/dokick.c:1717`: shipped objects get the shipped-object break test only after the down-gate fall succeeds.
- `nethack-c/upstream/src/dokick.c:1743`: surviving shipped objects migrate instead of being placed on the current level.
- `nethack-c/upstream/src/dokick.c:1943`: down gates include seen holes and trapdoors.

JS anchors:

- `js/cmd.js:20996`: `landProjectileObjectWithShopHandling()` runs floor effects and then immediately places the projectile.
- `js/cmd.js:22862`: current hole/trapdoor shipping is inside hero-square `earthFloorEffects()`, so remote seen holes and trapdoors miss C's post-floor gate.
- `js/cmd.js:3442`: shipped-object break machinery exists and should run after the fall gate.
- `js/cmd.js:3327`: migration queue machinery already exists.

Smallest safe slice: add a post-`earthFloorEffects()` gate in `landProjectileObjectWithShopHandling()` for non-gold hero projectiles landing on a remote seen `HOLE` or `TRAPDOOR`. Cover no-placement/no-sale behavior, migration queueing, fall-roll-before-break RNG order, and break-before-queue behavior. Keep gold, stairs/ladders, floor-pile impact loss, and monster-thrown ordering separate.

### Stone-to-Flesh Carried Figurine Animation

C source:

- `nethack-c/upstream/src/zap.c:1993`: `stone_to_flesh_obj()` handles figurines inside the object-hit path after mineral/gemstone and resistance gates.
- `nethack-c/upstream/src/zap.c:2009`: object location is captured before animation.
- `nethack-c/upstream/src/zap.c:2019`: non-flesh golem figurines redirect to flesh golem data.
- `nethack-c/upstream/src/zap.c:2021`: vegetarian non-golems still become meatballs.
- `nethack-c/upstream/src/zap.c:2033`: ordinary figurines animate with `makemon(ptr, x, y, NO_MINVENT | MM_NOMSG)`.
- `nethack-c/upstream/src/zap.c:2041`: successful animation stops object timers before consumption.
- `nethack-c/upstream/src/zap.c:2043`: carried success uses `useup(obj)`, floor success uses `delobj(obj)`.
- `nethack-c/upstream/src/zap.c:2047`: visible success messages are `The figurine animates!` or `The figurine turns to flesh and animates!`.

JS anchors:

- `js/cmd.js:12535`: self-cast stone-to-flesh inventory handling still routes through synchronous replacement logic.
- `js/cmd.js:12466`: current figurine support only covers vegetarian meatball replacement.
- `js/figurine.js:98`: `makeFigurineFamiliar()` is not C-equivalent because it applies familiar behavior and a chance path.
- `js/mklev.js:6882`: JS `makemon()` already relocates away from the hero square when given hero coordinates.

Smallest safe slice: implement carried self-cast figurine animation only. After the existing mineral/resistance gate and vegetarian meatball row, redirect non-flesh golems to flesh golem, call `makemon()` with `NO_MINVENT | MM_NOMSG`, explicitly stop figurine timers, remove the inventory item, and emit the C success message. Defer floor figurines, shop billing, statue contents, and failed-animation corpse fallback.

### Burning-Oil Water And Pool Evaporation

C source:

- `nethack-c/upstream/src/explode.c:974`: `explode_oil()` clears lit-oil state and routes to the regular fiery explosion.
- `nethack-c/upstream/src/explode.c:481`: each 3x3 blast square calls `zap_over_floor()` before monster and hero explosion damage.
- `nethack-c/upstream/src/zap.c:5164`: fire-over-floor order is web, ice, water/pool, fountain, then later floor-object burning.
- `nethack-c/upstream/src/zap.c:5175`: water and pool handling creates gas with `rnd(5)` off the water level, changes `POOL` to `ROOM` plus `PIT`, and then runs swimmer and pit fallout.

JS anchors:

- `js/cmd.js:13897`: direct lit-oil terrain currently handles webs, ice, and floor objects but not water or pools.
- `js/fire_breath.js:342`: `applyFireRayWaterTerrain()` already has most water/pool side effects: gas cloud RNG, water-level message split, pool-to-room conversion, pit creation, swimmer unhide, redraw, and pit fallout.

Smallest safe slice: call the water helper during the direct lit-oil 3x3 floor pass after ice and before floor-object fire. Preserve a blast-wide `heardGas`/previous-message context for repeated gas feedback, ignore the ray `rangeMod` return, and keep fountains and doors separate.

## Remaining Notes

- Polyself diet is now covered for stone-to-flesh smell, delayed tripe, and tin eating.
- Remaining diet work should be caller-led: pet food first, then non-food metallivorous `#eat`.
- Burning-oil water/pool evaporation, carried figurine animation, and remote projectile down-gate remain the highest-signal compact follow-up slices.
