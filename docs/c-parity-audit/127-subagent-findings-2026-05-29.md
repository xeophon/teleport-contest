# 127 - Monster-thrown remote seen-shaft shipping

## Implemented slice

Monster-thrown non-boulder, non-gold objects now run the remote seen `HOLE`/`TRAPDOOR` `ship_object()` gate before monster-thrown floor effects, current-level placement, and stacking. This mirrors C `drop_throw()` ordering for the compact row where the landing square is remote, visible, unoccupied by the hero or a monster, and has a seen hole or trap door to a valid lower level.

The slice intentionally keeps boulders out of the shipping helper. C's `ship_object()` treats boulders as a special exception on holes and trap doors, so monster-thrown boulders stay on the existing floor-effect path and can plug a remote seen hole instead of being queued for migration.

## C references

- `nethack-c/upstream/src/mthrowu.c:170` handles special broken missile cases before the ordinary thrown-object floor path.
- `nethack-c/upstream/src/mthrowu.c:180` through `mthrowu.c:181` call `down_gate()` and `ship_object()` before floor effects and current-level placement.
- `nethack-c/upstream/src/dokick.c:1651` starts `ship_object()` by asking `down_gate()` for the destination.
- `nethack-c/upstream/src/dokick.c:1657` applies the ordinary `rn2(3)` stay/fall branch for non-ladder hole and trap-door shipping.
- `nethack-c/upstream/src/dokick.c:1677` keeps boulders from ordinary hole/trapdoor shipping.
- `nethack-c/upstream/src/dokick.c:1695` through `dokick.c:1752` order transit wording, shop debt, breakage, migration, and floor-pile impact.
- `nethack-c/upstream/src/dokick.c:1943` implements `down_gate()` for holes, trap doors, stairs, ladders, and special stairs.
- `nethack-c/upstream/src/dokick.c:1963` gates ordinary hole/trapdoor `MIGR_RANDOM` shipping on seen traps.

## JS changes

- `js/cmd.js:25784` now lets `landMonsterThrownObject()` attempt `maybeShipRemoteProjectileObject()` before `monsterThrownFloorEffects()` for non-boulder objects.
- `js/cmd.js:22023` keeps the remote shaft gate narrow: no gold by default, no hero square, no occupied monster square, seen `HOLE`/`TRAPDOOR` only, and fall-capable destination levels only.
- `js/cmd.js:22037` reuses the existing C-shaped remote projectile shipping result, including no-drop, debt, breakage, migration, and impact-drop metadata.
- Boulders get an empty shipping result and continue into `monsterThrownFloorEffects()`, preserving the existing plugging behavior.
- `test/shop-billing-helpers.test.mjs:17340` adds focused monster-thrown coverage for pre-floor-effect shipping, trap-door wording, no-drop placement/stacking, unseen-trap exclusion, and boulder no-shipping behavior.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "monster-thrown (dagger falling through remote seen hole|dagger falling through remote seen trap door|remote shaft no-drop|dagger ignores unseen remote trap door|boulder plugs remote seen hole)|remote projectile shaft no-drop|paid same-shop projectile falling through remote|rock projectile impact" test/shop-billing-helpers.test.mjs` (`9/9 matching tests passing`)
- `node --test test/shop-billing-helpers.test.mjs` (`858/858 passing`)
- `git diff --check`
- `npm run score` (`44/44 passing`)

## Deferred candidates from this subagent round

- Shop-billed floor figurine stone-to-flesh animation is a narrow next slice: run material/resistance gates, create the monster, charge a `stolen_value()`-shaped floor loss before timer cleanup/deletion, and avoid used-up bill preservation.
- Floor statue stone-to-flesh animation can start with a non-shop, non-trap, non-golem, nonvegetarian statue that transfers contents to the created monster. Shop billing, golems, failed-animation fallback, trap squares, and saved monster traits should stay separate.
- Stairs, ladders, and special-stairs projectile shipping need migration records with source level, target level, destination mode, and flags before behavior expansion.
- Burning-oil shop-door damage needs a terrain-damage subsystem with `SHOP_DOOR_COST`, `pay_for_damage("burn away", FALSE)` timing, and delayed repair, not object billing.
- Force-lock mimic wake preservation already matches C for the current helper; useful follow-up work is visible object/furniture mimic regression coverage and broader mimic appearance representation.
