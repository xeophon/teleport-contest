# C Parity Audit 454: Monster Hero Polyself Projectile Hit Value Passive Landing

Implemented the narrow monster-thrown normal-projectile hero/polyself hit-value bonus and added a production canary for hero-square passive-object landing. No replay maps, private fixtures, player names, or seed-specific runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:687`: monster-thrown object flight reaches the hero square through `u_at()`.
- `nethack-c/upstream/src/mthrowu.c:691-696`: unicorn gem catches and general `u_catch_thrown_obj()` happen before hit/damage handling.
- `nethack-c/upstream/src/mthrowu.c:722`: ordinary monster-thrown objects use `dmgval(singleobj, &gy.youmonst)`.
- `nethack-c/upstream/src/mthrowu.c:723-737`: normal object hit value is distance-clamped, gets shooter/ammo bonuses, gets `bigmonst(gy.youmonst.data)` bonus, then adds `8 + spe`.
- `nethack-c/upstream/src/mthrowu.c:740-742`: non-acid-venom damage is physical-damage adjusted before `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:787-789`: hit ordinary thrown objects call `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/mthrowu.c:183-190`: `drop_throw()` substitutes `&gy.youmonst` for a hero-square landing and calls `passive_obj(mtmp, obj, NULL)` before stacking when `ohit` is true.
- `nethack-c/upstream/src/uhitm.c:6146-6178`: passive object effects select the passive `AT_NONE` attack and erode objects for fire, acid, rust, and corrosion passives.
- `nethack-c/upstream/src/trap.c:282-287`: visible erosion prints the object erosion message from `erode_obj()`.

## JS Changes

- Added `heroPolyselfMonsterThrownHitBonus()`, using the current polymorphed monster form size/large flags instead of monster names.
- Threaded the bonus into the normal hero-hit `thitu()` equivalents for monster-slung ammo, launcher arrows, spears, shuriken, plain daggers, and ordinary knives.
- Extended the production plain-dagger helper with a `heroPolyself` option so tests can exercise hero-square passive object delivery without inventing a fake intervening monster.
- Added a canary where a big corrosive polyself form turns a borderline plain-dagger shot into a hit, queues hero damage, lands on the hero square, corrodes only the thrown dagger, and keeps it separate from a clean compatible floor stack.

## Tests

- `production monster plain dagger big polyself hit corrodes landing object before stacking`
- Existing focused guards:
  - `production monster plain dagger hits and rusts intervening rust monster object before stacking`
  - `production monster plain dagger hit bonus can turn intervening miss into hit`

Verified with:

```sh
node --test --test-name-pattern "big polyself hit corrodes|plain dagger hit bonus|plain dagger hits and rusts" test/shop-billing-helpers.test.mjs
```

## Remaining

- Lethal launcher-arrow death cleanup remains intentionally separate: audit 386 documents the current `done_object_cleanup()` path and its bypass of normal `drop_throw()`/hit-only RNG before death.
- Broader hero/polyself canaries for other passive damage types, direct hero melee passive-object erosion, and disenchanter `AD_ENCH` drain remain good source-backed follow-ups.
