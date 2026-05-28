# Subagent Findings 68: Direct Common No-Effect Potionhit

## Scope

Audit and implement the direct hero-thrown `potionhit()` branch for potions whose monster switch has no monster-specific effect but still uses C's common crash, chip, evaporate, wake/anger, vapor/trycall, and shop/freeing tail.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` routes a hit by a thrown potion to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1625` starts `potionhit(mon, obj, how)`.
- `nethack-c/upstream/src/potion.c:1653` prints the visible target crash message, while unseen targets get `Crash!`.
- `nethack-c/upstream/src/potion.c:1675` applies the common `rn2(5)` one-HP chip when the target has more than one HP and no saddle was hit.
- `nethack-c/upstream/src/potion.c:1679` prints visible non-oil evaporation before the monster switch.
- `nethack-c/upstream/src/potion.c:1728` defaults `angermon` to hero fault for monster-effect handling.
- `nethack-c/upstream/src/potion.c:1888` explicitly leaves `POT_GAIN_LEVEL`, `POT_LEVITATION`, `POT_FRUIT_JUICE`, `POT_MONSTER_DETECTION`, and `POT_OBJECT_DETECTION` as no-op monster cases.
- `POT_SEE_INVISIBLE`, `POT_GAIN_ENERGY`, and `POT_ENLIGHTENMENT` have no case in the monster switch, so they fall through the same common no-effect path.
- `nethack-c/upstream/src/potion.c:1897` wakes or angers the surviving monster after the switch; hero-thrown no-effect potions retain the default anger.
- `nethack-c/upstream/src/potion.c:1906` applies adjacent/same-square hero vapor after the monster tail, otherwise calls `trycall()` when the potion was description-known and the target square is visible.

## JS Findings

- `js/cmd.js` already had `heroThrownPotionHitMonster()` with the common direct-hit ordering for supported direct potion families.
- `supportsHeroThrownPotionHit()` excluded no-effect identities other than hallucination, so throwing levitation, see-invisible, gain-level, enlightenment, detection, gain-energy, or fruit-juice potions at a monster used the generic non-combat miss/landing path instead of C's `potionhit()`.
- The current JS vapor helper has broad hero-side gaps for several of these potions. This slice therefore verifies non-adjacent monster hits and keeps adjacent hero vapor follow-up as a documented gap.

## Implementation

- Added a shared `COMMON_NO_MONSTER_EFFECT_POTION_HIT_KINDS` set for:
  - `levitation`
  - `see invisible`
  - `gain level`
  - `enlightenment`
  - `monster detection`
  - `object detection`
  - `gain energy`
  - `fruit juice`
- Extended direct hero-thrown potion support so those identities route through the existing common `potionhit()` helper.
- Added an explicit no-monster-effect branch in `heroThrownPotionHitMonster()` that leaves the common default anger behavior intact.
- Extended test potion index metadata for monster and object detection.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- all named common no-effect potions use the direct crash/chip/evaporate path;
- those hits wake and anger a peaceful sleeping target;
- the potion is consumed without creating a floor object;
- no monster-specific or hero vapor text appears for non-adjacent hits;
- description-known no-effect hits do not auto-discover the potion;
- a common no-effect hit can be identified from `potionIndex` even when the visible object name is only an appearance.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='hero-thrown|potionhit|direct vapor|broken potion|monster temporary blindness' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Adjacent hero vapor effects for levitation, see invisible, gain level, enlightenment, detection, gain energy, and fruit juice remain broader than this slice.
- The `trycall()` prompt path is still represented only by non-discovery behavior in these direct-hit tests.
- Sickness, water, oil, acid, and polymorph are real monster-effect branches and remain unported for direct hero-thrown hits.
- Saddle-hit targeting remains outside this helper, including the water-specific saddle BUC handling and polymorph saddle wet-message branch.
