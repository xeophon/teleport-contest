# C Parity Audit 780: Monster Launcher Intervening Passive Object

## C Source Anchors

- `nethack-c/upstream/src/mthrowu.c:673-687`: monster projectile flight checks intervening monsters before the hero square.
- `nethack-c/upstream/src/mthrowu.c:373-494`: `ohitmon()` applies projectile hit fallout and then calls `drop_throw(otmp, 1, gb.bhitpos.x, gb.bhitpos.y)`.
- `nethack-c/upstream/src/mthrowu.c:170-190`: `drop_throw()` performs hit-only mulch before landing, then places the object, runs `passive_obj()` for an `ohit` target, and only then stacks it.
- `nethack-c/upstream/src/uhitm.c:6127-6184`: `passive_obj()` handles passive `AT_NONE` object effects, including rust, corrosion, fire, acid, and disenchantment.
- `nethack-c/upstream/include/objects.h:140-157`: projectile material reflects the arrowhead, so ordinary arrows, orcish arrows, ya, and crossbow bolts are rust-prone/metal projectiles while elven and silver arrows keep their distinct material behavior.

## JS Parity Notes

- `js/allmain.js` now records a live intervening launcher-arrow hit target as `_arrow_drop_throw_after_topline_more.passiveTarget`.
- `js/cmd.js` now forwards that deferred `passiveTarget` into `landMonsterThrownObject(...)`, reusing the shared monster-thrown landing path.
- `landMonsterThrownObject()` already keeps C's order: hit-only mulch before passive object erosion and passive object erosion before floor stacking.
- `wishedDamageProfile()` now treats ordinary arrows, orcish/crude arrows, ya/bamboo arrows, and crossbow bolts as rust-prone projectiles for passive object erosion while preserving elven-arrow flammability and silver-arrow exclusion.

## Tests Added

Added focused production launcher-arrow coverage in `test/shop-billing-helpers.test.mjs`:

- `production monster launcher arrow hits and rusts intervening rust monster object before stacking`
- `production monster launcher arrow hit on intervening rust monster can mulch before passive rust`

The assertions cover the visible passive rust message, landed-arrow `oeroded` state, pre-existing clean stack preservation, no hero hit, no iron-bars clonk, and hit-only mulch consuming the projectile before passive erosion or stacking.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "production monster launcher arrow (hits and rusts intervening rust monster|hit on intervening rust monster|can hit intervening monster before hero)" test/shop-billing-helpers.test.mjs` - 3 pass, 2763 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` - 44/44 passing
