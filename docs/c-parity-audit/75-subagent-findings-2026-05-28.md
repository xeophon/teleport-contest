# Subagent Findings 75: Direct Saddle Water Potionhit

## Scope

Implement the worn-saddle interception portion of direct hero-thrown potions of water hitting saddled monsters. This slice covers real saddle objects, saddle-hit RNG, water BUC mutation, visible feedback, and the no-chip/no-evaporation/no-wake behavior for intercepted hits. Werecreature and vampire-shifter body-hit branches remain deferred.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` routes a successful thrown-potion hit to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1644` through `potion.c:1650` intercept a potion hit for targets with `W_SADDLE` and `which_armor(mon, W_SADDLE)`.
- `nethack-c/upstream/src/potion.c:1647` through `potion.c:1650` use `!rn2(10) || (POT_WATER && ((rnl(10) > 7 && cursed) || (rnl(10) < 4 && blessed) || !rn2(3)))`, preserving left-to-right RNG consumption.
- `nethack-c/upstream/src/potion.c:1660` through `potion.c:1669` name visible saddle impacts as `<monster>'s saddle`.
- `nethack-c/upstream/src/potion.c:1675` and `potion.c:1679` skip the ordinary monster HP chip and evaporation message when `hit_saddle`.
- `nethack-c/upstream/src/potion.c:1706` through `potion.c:1726` call `H2Opotion_dip()` for water-on-saddle and print `<Monster>'s saddle gets wet.` when visible and unchanged.
- `nethack-c/upstream/src/potion.c:1897` applies the wake/anger tail only in the monster-effect branch, so saddle interception leaves the monster sleeping/peaceful.
- `nethack-c/upstream/src/potion.c:1906` still runs the common vapor/call tail after saddle interception.
- `nethack-c/upstream/src/potion.c:1514` through `potion.c:1530` define water BUC effects: blessed water uncurses or blesses, cursed water unblesses or curses, and neutral water does no saddle damage.

## JS Findings

- `js/cmd.js` already had `monsterHasWornSaddle()` but direct water hits treated every saddle target as deferred, so C's saddle interception was absent.
- Direct hit helpers needed a real saddle object for BUC mutation. A boolean `mon.saddled` alone cannot model a cursed or blessed saddle, so direct saddle-water support is limited to monsters with an actual worn saddle object.
- Existing water dip messaging and BUC state transitions for carried objects were a close match, but saddle wording uses the monster possessive rather than `Your`.
- Shapechanging water hits still lack a reusable `new_were()` equivalent. C can intercept a saddle before those shape branches, but JS defers the compound saddled werecreature/vampire-shifter cases until a missed saddle roll can fall through to a correct body-hit transformation.

## Implementation

- Added `monsterWornSaddleForPotionHit()` and `isSaddleWaterPotionHit()` for water-on-saddle routing.
- Added C-shaped saddle-hit RNG with the same left-to-right `rn2(10)`, `rnl(10)`, and fallback `rn2(3)` calls.
- Added `waterPotionHitSaddle()`:
  - blessed water uncurses cursed saddles or blesses uncursed saddles;
  - cursed water unblesses blessed saddles or curses uncursed saddles;
  - neutral or already-matching BUC water prints the visible wet-saddle message without damage.
- Direct saddle hits now suppress monster HP chip, water evaporation, and wake/anger, while still allowing the shared post-hit vapor/discovery tail.
- If the saddle roll misses, saddled non-shapechanging targets continue into the ordinary water monster branches.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- blessed water uncursing a cursed worn saddle;
- cursed water cursing an uncursed worn saddle;
- neutral water wetting an unaffected worn saddle;
- a blessed water saddle-roll miss falling through to the monster body hit, including ordinary chip, evaporation, wake, anger, and unchanged saddle BUC.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='hero-thrown.*water potion|special-water|saddle' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Werecreature `new_were()` reversion/transformation remains deferred, including compound saddled werecreature cases where C could hit the saddle first.
- Vampire-shifter-specific form handling remains deferred, including compound saddled vampire-shifter cases where C could hit the saddle first.
- Saddle shop-billing side effects for unpaid saddle BUC alteration remain deferred until saddle ownership/billing is represented.
- Lit oil still needs reusable `explode_oil()`/burning-oil explosion plumbing.
- Polymorph still needs a broader `bhitm()` object-hit implementation.
