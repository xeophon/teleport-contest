# Subagent Findings 78: Direct Lit-Oil Potionhit

## Scope

Implement direct hero-thrown lit potion of oil hits through the shared `potionhit()` path. This slice covers the monster-hit routing, no-evaporation behavior, burning-oil explosion damage dice, nearby monster/hero blast effects, and the generic saddle-hit bypass for oil.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` routes a successful hero-thrown potion hit to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1623` defines `potionhit()` as always using up the potion.
- `nethack-c/upstream/src/potion.c:1644` through `potion.c:1650` roll worn-saddle interception before chip damage and before potion-specific body effects; any potion has the generic `!rn2(10)` saddle chance, while water gets extra BUC chances.
- `nethack-c/upstream/src/potion.c:1675` applies the common `rn2(5)` one-HP chip only when the saddle was not hit.
- `nethack-c/upstream/src/potion.c:1679` skips evaporation text for oil and saddle hits.
- `nethack-c/upstream/src/potion.c:1866` through `potion.c:1868` make a non-saddle lit oil body hit call `explode_oil(obj, tx, ty)`; unlit oil has no body effect.
- `nethack-c/upstream/src/explode.c:962` through `explode.c:968` make burning oil deal `d(4,4)`, or `d(3,4)` when diluted, as a fiery 3x3 explosion using `BURNING_OIL`.
- `nethack-c/upstream/src/explode.c:503` prints visible monster caught-in-burning-oil feedback, `explode.c:532` through `explode.c:548` apply magic resistance halving and cold-vulnerability doubling, and `explode.c:582` angers surviving affected monsters during hero-caused explosions.
- `nethack-c/upstream/src/explode.c:689` wakes nearby monsters with at least radius 50 after the explosion.

## JS Findings

- `heroThrownPotionHitMonster()` already owned crash text, common chip damage, oil no-evaporation, wake/anger, vapor naming, shop debt, and consumed-thrown-object behavior for supported potion identities.
- Lit oil was excluded by the direct-hit support gate, so it fell through to generic thrown-object landing instead of `potionhit()` and `explode_oil()`.
- Existing fire helpers already provided C-shaped monster/hero inventory fire damage pieces used by scroll/fire-ray paths; this slice adds a small burning-oil explosion wrapper rather than introducing a broad explosion engine.

## Implementation

- Added lit-oil support to the direct hero-thrown potionhit gate.
- Added `explodeBurningOilPotion()` for direct oil hits:
  - consumes C's `d(4,4)` or diluted `d(3,4)` explosion roll once per blast;
  - prints `Boom!` when the explosion is visible and the hero is not deaf;
  - damages monsters in the 3x3 blast, with fire resistance preventing main blast damage, magic resistance halving non-resistant damage, and cold resistance doubling fire damage;
  - catches the adjacent hero in the blast and applies existing fire inventory damage;
  - wakes nearby sleepers after the explosion.
- Broadened saddle interception for oil so a lit oil potion that hits the saddle wets it and does not explode, matching C's saddle-first branch.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- unlit oil still uses the common direct `potionhit()` route without evaporation or explosion;
- lit oil explodes on a direct monster hit and consumes the thrown potion without floor placement;
- diluted lit oil uses `d(3,4)` and fire-resistant monsters avoid main blast damage;
- adjacent lit oil catches the hero in the burning-oil blast instead of applying ordinary vapor;
- lit oil hitting a worn saddle wets the saddle and does not explode.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='lit oil|unlit oil|potionhit' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Direct potion of polymorph `bhitm()`/`newcham()` behavior remains the next compact direct `potionhit()` family.
- Generic saddle interception is still only modeled for water and oil; C rolls the generic saddle chance for all direct potion hits.
- Full `explode()` parity remains broader: exact temporary explosion display, terrain/floor-object `zap_over_floor()` side effects, complete item destruction details, and precise kill/no-corpse flags are still shared explosion-system work.
- Wielded-potion bash delivery and exact non-`kn` `trycall()` prompting remain open.
