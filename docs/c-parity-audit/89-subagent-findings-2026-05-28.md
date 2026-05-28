# Audit 89: Projectile Floor-Effects Gate

Date: 2026-05-28

## Implemented Slice

This slice implements the narrow hero-projectile landing gap selected from the fresh C-source audit:

- hero-thrown projectile landings now run floor effects before placing the object on the level;
- floor-effect consumption returns immediately, so swallowed/burned/sunk objects skip container impact, shop return/sale, and stack merge;
- thrown objects are normalized for floor-effect handling before the gate runs;
- lava is no longer treated as soft projectile landing terrain, so hard-landing breakage is attempted before lava floor effects.

## C Anchors

- `nethack-c/upstream/src/dothrow.c:1788`: hard-landing break messages and `breakobj()` run before floor effects for hero-thrown objects.
- `nethack-c/upstream/src/dothrow.c:1804`: `flooreffects(obj, bhitpos, "fall")` runs before object placement.
- `nethack-c/upstream/src/dothrow.c:1819`: `ship_object()` is the next remaining pre-placement gate when there is no monster.
- `nethack-c/upstream/src/dothrow.c:1824`: placement happens only after the pre-placement gates.
- `nethack-c/upstream/src/dothrow.c:1830`: container impact damage follows placement.
- `nethack-c/upstream/src/dothrow.c:1835`: `check_shop_obj()` follows impact damage.
- `nethack-c/upstream/src/dothrow.c:1838`: stack merge is last in the landing path.
- `nethack-c/upstream/src/dothrow.c:2721`: thrown gold also runs `flooreffects()` before placement, sale, and stacking.
- `nethack-c/upstream/include/rm.h:140`: `IS_SOFT(typ)` includes air, cloud, and pools, not lava.
- `nethack-c/upstream/src/do.c:162`: `flooreffects()` returns true when the object goes away.
- `nethack-c/upstream/src/do.c:270`: lava and pool effects can consume landing objects.
- `nethack-c/upstream/src/do.c:288`: pits and holes can ship or lose landing objects.
- `nethack-c/upstream/src/do.c:318`: hot-ground potion effects can consume landing potions.

## JS Touch Points

- `js/cmd.js`: `projectileLandingIsSoft()` now follows C's soft-terrain boundary by excluding lava.
- `js/cmd.js`: added `prepareProjectileFloorObject()` so thrown objects have floor coordinates and are no longer marked transient/contained before floor effects inspect them.
- `js/cmd.js`: `landProjectileObjectWithShopHandling()` now calls `earthFloorEffects(..., "fall", { usedUpShopBillOnDestroy: true })` before placement, impact, shop handling, and stacking.
- `test/shop-billing-helpers.test.mjs`: moved the existing soft-landing container test to a real pool tile and added coverage for hole floor effects, lava consumption before sale/stack, and lava hard-landing breakage before floor effects.

## Deferred Gaps

- `ship_object()` down-gate handling remains separate. C checks it before placement for ordinary projectile landings and has distinct fragile-break and shop-debt behavior.
- Monster-thrown object landing still needs its own C-order audit before sharing this helper more broadly.
- Floor-pile down-gate loss and gold-throw shipping still need source-backed slices.

## Additional Subagent Follow-Ups

- Shifted-vampire water hits: lethal blessed water calls `killed(mon)` from `potionhit()` (`nethack-c/upstream/src/potion.c:1831`, `:1834`) and `mondead()` revives shifted vampires through `vamprises()` (`nethack-c/upstream/src/mon.c:3096`, `:2886`). JS still routes that branch through ordinary monster death cleanup.
- Monster diet metadata: C uses `M1_CARNIVORE`, `M1_HERBIVORE`, and related diet flags (`nethack-c/upstream/include/monflag.h:114`, `:115`; `nethack-c/upstream/include/mondata.h:90`, `:91`). JS still has ad hoc diet-name checks for polyself smell and pet-food behavior.
- Forced chest wake disturbance: blunt force calls `wake_nearby(FALSE)` (`nethack-c/upstream/src/lock.c:241`), which eventually shortens buried-zombie timers (`nethack-c/upstream/src/mon.c:4398`; `nethack-c/upstream/src/hack.c:1798`). JS wakes nearby sleepers but still does not disturb buried zombies on that path.

## Verification

Focused checks run after code changes:

```bash
node --check js/cmd.js
node --check test/shop-billing-helpers.test.mjs
node --test --test-reporter=spec --test-name-pattern 'projectile|landing|soft-landing|floor effects|lava' test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
npm run score
```

Result: focused projectile/floor-effects tests pass, `29` run and `724` skipped under the name filter; full helper suite passes `753/753`; public score remains `44/44`.
