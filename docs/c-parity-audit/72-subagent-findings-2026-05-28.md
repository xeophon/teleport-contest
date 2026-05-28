# Subagent Findings 72: Direct Acid Potionhit

## Scope

Audit and implement the direct hero-thrown potion of acid monster-hit branch. This slice covers acid resistance, potion magic resistance, visible pain feedback, non-silent wake-nearby behavior, acid damage, lethal removal/vanquish bookkeeping, and unpaid stack consumption for the thrown unit. It does not add bash delivery, lit oil explosions, polymorph `bhitm()`, or special water monster branches.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` routes a hit by a thrown potion to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1625` starts `potionhit(mon, obj, how)`.
- `nethack-c/upstream/src/potion.c:1653` through `potion.c:1679` handle the common crash, shard chip, and visible non-oil evaporation before monster effects.
- `nethack-c/upstream/src/potion.c:1870` starts the `POT_ACID` monster branch.
- `nethack-c/upstream/src/potion.c:1871` gates acid damage behind `resists_acid(mon)` and `resist(mon, POTION_CLASS, 0, NOTELL)`.
- `nethack-c/upstream/src/potion.c:1872` through `potion.c:1875` print pain feedback and wake nearby monsters for non-silent targets.
- `nethack-c/upstream/src/potion.c:1876` through `potion.c:1881` roll `d(cursed ? 2 : 1, blessed ? 4 : 8)` damage and kill the monster when appropriate.
- `nethack-c/upstream/src/potion.c:1897` applies the surviving-monster wake/anger tail.
- `nethack-c/upstream/src/potion.c:1906` applies adjacent hero vapor or description-known `trycall()` after the monster effect.

## JS Findings

- `js/cmd.js` already had a shared direct `potionhit()` skeleton for common hit ordering and shop lifetime.
- Acid identity helpers existed for `#dip` and water destruction, but acid was not included in direct hero-thrown support.
- `monsterResistsEffect(mon, 6)` already matches the C potion-class `resist()` attack level.
- Existing kill bookkeeping is embedded in melee paths, so acid needed a small local death helper rather than a broad combat refactor.

## Implementation

- Added acid to `supportsHeroThrownPotionHit()`.
- Added acid-specific helpers for monster acid resistance, silent pain wording, C-shaped wake-nearby radius, and local monster death cleanup.
- Added `acidPotionHitMonster()`:
  - acid-resistant and potion-resistant monsters receive only the common crash/chip/evaporation/wake/anger path;
  - ordinary targets print `shrieks in pain`, wake nearby sleepers, and take acid dice damage;
  - lethal hits remove the monster, record vanquish credit, drop inventory, and create corpse/glob drops through existing helpers.
- Adjusted the common surviving-monster tail to skip monsters already killed by a potion branch.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- ordinary acid damage, visible pain feedback, nearby sleeper wakeup, anger, consumption, and no floor potion;
- intrinsic acid resistance prevents acid damage and pain feedback;
- potion magic resistance prevents acid damage and pain feedback while consuming the potion;
- lethal acid removes the monster and records vanquish credit;
- unpaid acid stacks split the thrown unit and charge only that unit while preserving the residual live bill.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='hero-thrown|potionhit|direct vapor|broken potion|monster temporary blindness' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Bash delivery remains outside the direct hero-thrown helper.
- Special water branches for blessed/cursed water, gremlin split, iron golem rust, were/vampire transformations, and saddle hits remain deferred.
- Lit oil still needs reusable `explode_oil()`/burning-oil explosion plumbing.
- Polymorph still needs a broader `bhitm()` object-hit implementation.
- Exact non-`kn` `trycall()` prompting and broader visibility/discovery behavior remain incomplete.
