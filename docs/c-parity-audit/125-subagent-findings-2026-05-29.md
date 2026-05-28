# 125 - Burning-oil blast door terrain

## Implemented slice

Direct hero-thrown lit-oil potion explosions now run the C fire-over-floor door branch during the 3x3 blast floor pass. Secret doors are revealed with blast wording, closed or locked doors are consumed by fire, terrain redraw and vision recalculation run before later effects, and floor-object burning still happens after door terrain and before monster/hero burning-oil damage.

This slice intentionally does not add C `add_damage()` / `pay_for_damage("burn away")` shop-door repair billing because the current JS shop helpers do not expose an equivalent shop-door damage scheduler. It also does not add drawbridge destruction; the C burning-oil path reaches `zap_over_floor()`, not the drawbridge destruction helper.

## C references

- `nethack-c/upstream/src/explode.c:255` marks burning-oil floor effects with `exploding_wand_typ = POT_OIL`.
- `nethack-c/upstream/src/explode.c:478` through `explode.c:503` run explosion floor effects before monster damage.
- `nethack-c/upstream/src/explode.c:590` keeps hero damage after the floor and monster passes.
- `nethack-c/upstream/src/explode.c:681` calls `pay_for_damage("burn away", FALSE)` when floor handling reports shop damage.
- `nethack-c/upstream/src/zap.c:5387` maps lit-oil and fire-scroll explosions to non-wand "blast" wording.
- `nethack-c/upstream/src/zap.c:5397` through `zap.c:5405` convert secret doors, recalculate blocking, redraw, and print `The blast reveals a secret door.` when visible.
- `nethack-c/upstream/src/zap.c:5412` through `zap.c:5478` consume closed/locked doors with fire, schedule shop door repair/damage, recalculate blocking, redraw visible doors, and use `You smell smoke.` when unseen.
- `nethack-c/upstream/src/zap.c:5489` through `zap.c:5492` burn floor objects after terrain/door handling and print smoke feedback.
- `nethack-c/upstream/src/shk.c:4398` through `shk.c:4435` implement shop-door `add_damage()` scheduling and real-shop-door filtering.

## JS changes

- `js/cmd.js` adds `applyBurningOilDoorTerrain()` and calls it from `burnFloorObjectsFromBurningOilExplosion()` after web/ice/water/fountain terrain and before floor-object fire.
- The helper uses `cansee()` plus blindness for C visible text, uses smell feedback when unseen, updates secret doors to ordinary doors, consumes closed/locked doors by setting `D_NODOOR`, calls `newsym()`, and refreshes vision after terrain changes.
- `js/vision.js` now treats a sparse previous visibility row as unseen during recalculation. This matches the existing blind-branch tolerance and prevents terrain recalculation from depending on tests having fully allocated manual visibility arrays.
- `test/shop-billing-helpers.test.mjs` adds focused lit-oil door tests for visible closed doors, visible closed secret doors, deaf/blind smell feedback, and door-before-floor-object-before-monster ordering.

## Verification

- `node --check js/cmd.js`
- `node --check js/vision.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "lit oil explosion (consumes closed doors|reveals then consumes|still smells|burns floor objects|melts blast ice|evaporates blast pools|steams and dries|burns visible webs)|lit oil potion explodes" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`850/850 passing`)
- `npm run score` (`44/44 passing`)

## Deferred candidates from this subagent round

- Shop-door repair/damage for burning-oil blasts: add a C-shaped door-damage scheduler before charging `SHOP_DOOR_COST`; do not approximate it through floor-object shop merchandise helpers.
- Projectile `ship_object()` down-gates for down stairs, down ladders, and special/branch stairs: extend the current seen-hole/trapdoor helper while preserving the ladder always-drop rule and stair-arrival metadata.
- Floor non-shop figurine stone-to-flesh animation: animate with `makemon(..., NO_MINVENT | MM_NOMSG)`, stop transform timers, delete the floor object, and leave shop-billed animation for a later slice.
- Ordinary non-petrifying corpse `toss_up()`: add upward self-hit/roof-hit handling with C breaktest RNG, corpse weight damage, hard-helmet mitigation, and landing before HP loss.
- Destroyed ice-box survivor timers: if helper-level forced destruction spills an ice-box corpse, convert frozen relative age and restart corpse timeout without making real `#force` target ice boxes.
- Monster-thrown object down-gate ordering: add the C `drop_throw()` shape where monster-thrown missiles call `ship_object()` before `flooreffects()` when landing on a valid down-gate.
