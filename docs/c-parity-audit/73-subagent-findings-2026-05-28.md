# Subagent Findings 73: Direct Special Water Potionhit

## Scope

Audit and implement the narrow unsaddled gremlin and iron golem sub-branch of direct hero-thrown potion of water monster hits. This slice covers special water routing, gremlin splitting, iron golem rust damage, lethal iron golem cleanup, and the surviving-monster wake/anger tail. It intentionally leaves saddle interception and blessed/cursed water effects against undead, demons, werecreatures, and vampire shifters for later shapechange and BUC side-effect slices.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` routes a hit by a thrown potion to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1625` starts `potionhit(mon, obj, how)`.
- `nethack-c/upstream/src/potion.c:1645` through `potion.c:1725` handle probabilistic saddle interception before monster water effects.
- `nethack-c/upstream/src/potion.c:1831` starts the monster `POT_WATER` branch.
- `nethack-c/upstream/src/potion.c:1854` clears gremlin anger and calls `split_mon(mon, NULL)`.
- `nethack-c/upstream/src/potion.c:1856` through `potion.c:1861` make iron golems rust, take `d(1,6)` damage, and die through `killed(mon)`.
- `nethack-c/upstream/src/potion.c:1897` applies the surviving-monster wake/anger tail.
- `nethack-c/upstream/src/potion.c:2873` through `potion.c:2909` describe `split_mon()`: current HP must exceed one, current and max HP are divided between original and clone, inventory is not cloned, and visible gremlins print `multiplies`.

## JS Findings

- `js/cmd.js` already had a target-aware neutral water gate for ordinary unsaddled monsters, and deferred gremlins, iron golems, blessing-haters, werecreatures, vampire shifters, and saddle hits.
- Existing water vapor code only split gremlin polyself; real-monster water split/rust helpers existed in `js/monster_liquid.js` but model terrain liquid behavior, including different RNG and damage for iron golems.
- Direct potionhit already had local kill cleanup for acid, which fits the iron golem lethal path.

## Implementation

- Added direct water support for unsaddled gremlins and iron golems before the neutral ordinary-water gate.
- Added a gremlin split helper shaped after C `split_mon()`:
  - skips targets at one HP;
  - halves current and maximum HP between original and clone;
  - clears cloned inventory and trap/leash state;
  - preserves visible naming and emits `The gremlin multiplies!`;
  - leaves the original unangered, matching `angermon = FALSE`.
- Added direct iron golem water handling:
  - visible golems print `The iron golem rusts.`;
  - direct potionhit rolls `d(1,6)`, not terrain-water `d(2,6)`;
  - lethal rust uses the existing potionhit kill helper;
  - surviving golems keep the default angry wakeup tail.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- blessed direct water splits an unsaddled gremlin without angering it;
- cursed direct water rusts and damages an unsaddled iron golem and wakes/angers it;
- direct water can destroy an unsaddled iron golem and record vanquish credit.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='hero-thrown|potionhit|direct vapor|broken potion|monster temporary blindness' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Saddle interception still needs the C `H2Opotion_dip()` object-BUC behavior, wet-saddle messaging, and visibility/knowledge side effects.
- Blessed water against undead, demons, werecreatures, and vampire shifters still needs pain damage plus wake-nearby and shapechange handling.
- Cursed water against those targets still needs capped healing, non-angering wake, and werebeast transformation.
- Lit oil still needs reusable `explode_oil()`/burning-oil explosion plumbing.
- Polymorph still needs a broader `bhitm()` object-hit implementation.
