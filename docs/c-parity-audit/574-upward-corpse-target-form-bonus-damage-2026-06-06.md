# C Parity Audit 574: Upward Corpse Target-Form Bonus Damage

Hero-thrown ordinary corpses now apply the same non-weapon falling-object target-form damage adjustments as C `toss_up()`. After the corpse weight roll is capped at 6, non-silver hits against shade forms are zeroed, blessed corpses add `rnd(4)` against undead and demon forms, and hard-helmet capping happens after those adjustments. C corpses are `FLESH`, so the ordinary corpse path remains non-silver.

No replay maps, private seeds, player names, move-count branches, or fixture-specific runtime branches are used. The canaries use deterministic unit-test RNG to assert live call order and damage.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1341` through `:1349`: non-potion, nonbreaking `toss_up()` self-hits enter the generic falling-object damage path and start from `dmgval()`.
- `nethack-c/upstream/src/dothrow.c:1356` through `:1372`: non-weapon fallback damage uses object weight, caps at 6, zeroes non-silver shade hits, and adds blessed/silver target-form bonuses.
- `nethack-c/upstream/src/dothrow.c:1374` through `:1380`: hard helmets cap damage only after those bonuses, then `u.udaminc` and `Maybe_Half_Phys()` apply.
- `nethack-c/upstream/src/mondata.c:540`: `hates_blessings()` is `is_undead(ptr) || is_demon(ptr)`.
- `nethack-c/upstream/include/objects.h:1050`: `CORPSE` material is `FLESH`, so ordinary corpses are non-silver.

## JS Changes

- `js/cmd.js`
  - `heroThrownCorpseFallingDamage()` now reuses the existing upward-object target predicates for shade, blessing-hating, silver-hating, and hard-helmet less-damage behavior.
  - Existing corpse-specific weight, landing, helmet message, half-physical, and fatal-state handling remain unchanged.

## Tests

- `upward hero-thrown blessed ordinary corpse gets undead-polyself damage bonus`
  - Pins the C `rnd(4)` blessed bonus against an undead polyself form before landing.
- `upward hero-thrown ordinary corpse cannot hurt shade polyself without silver`
  - Pins non-silver corpse zero damage against a shade polyself form without adding a bonus roll.
- `upward hero-thrown blessed ordinary corpse rolls undead bonus before helmet cap`
  - Pins the C ordering where `rnd(4)` is consumed before hard-helmet damage capping.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown ordinary corpse|upward hero-thrown blessed ordinary corpse|upward hero-thrown heavy ordinary corpse" test/shop-billing-helpers.test.mjs` - pass
- `node --test test/shop-billing-helpers.test.mjs` - pass, 2143/2143
- `node --test test/*.mjs` - pass, 2294/2294
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
