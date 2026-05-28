# Subagent Findings 69: Direct Unlit Oil Potionhit

## Scope

Audit and implement the direct hero-thrown `potionhit()` branch for unlit potion of oil hits. Lit-oil explosion behavior remains out of scope because it needs `explode_oil()`/burning-oil plumbing rather than the common no-effect monster branch alone.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` routes a hit by a thrown potion to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1625` starts `potionhit(mon, obj, how)`.
- `nethack-c/upstream/src/potion.c:1653` through `potion.c:1675` handle the common crash message and one-HP shard chip.
- `nethack-c/upstream/src/potion.c:1679` suppresses the evaporation message for oil.
- `nethack-c/upstream/src/potion.c:1866` handles `POT_OIL`; only lamplit oil calls `explode_oil(obj, tx, ty)`.
- `nethack-c/upstream/src/potion.c:1897` applies the common surviving-monster wake/anger tail.
- `nethack-c/upstream/src/potion.c:1906` applies the adjacent hero vapor or description-known `trycall()` tail.
- `nethack-c/upstream/src/potion.c:2103` leaves oil with no hero vapor effect in `potionbreathe()`.
- `nethack-c/upstream/src/explode.c:974` starts `explode_oil()`, the deferred lit-oil implementation target.

## JS Findings

- `js/cmd.js` already had a direct hero-thrown `potionhit()` helper that matches the common crash, shard chip, wake/anger, consumption, and non-floor-placement ordering for supported potion identities.
- Oil was excluded from direct potion support, so an unlit oil hit could fall through to the generic thrown-object path instead of consuming the potion via C's `potionhit()` route.
- C's unlit oil branch has no monster-specific effect but differs from the common no-effect potions because oil suppresses the evaporation message.

## Implementation

- Added an `isUnlitOilPotionHit()` predicate that recognizes oil potions whose `lamplit`/`burning` flags are clear.
- Extended direct hero-thrown potion support so unlit oil routes through the common `potionhit()` helper.
- Added an explicit unlit-oil monster branch that keeps default hero-thrown anger while preserving oil's no-evaporation behavior.
- Kept lamplit oil excluded so the later explosion slice can add `explode_oil()` behavior without conflating it with no-effect hits.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks that a direct hero-thrown unlit oil potion:

- prints the crash-and-shards message;
- does not print evaporation, miss, explosion, or odor vapor text;
- applies the common shard chip;
- wakes and angers a peaceful sleeping target;
- consumes the potion without leaving a floor object;
- preserves the expected direct-hit RNG sequence.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='hero-thrown|potionhit|direct vapor|broken potion|monster temporary blindness' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Lit potion of oil explosion through `explode_oil()`/burning-oil damage remains unimplemented.
- Oil explosion shop billing and object-loss attribution remain deferred with the explosion slice.
- Saddle-hit handling remains outside the direct helper, including water-specific saddle BUC handling and polymorph saddle wet-message behavior.
- The broader adjacent vapor and exact `trycall()` prompt machinery is still incomplete, even though oil itself has no vapor effect case.
