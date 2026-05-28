# Subagent Findings 74: Direct Blessing-Hater Water Potionhit

## Scope

Implement the non-saddled, non-shapechanging blessing-hater portion of direct hero-thrown potion of water monster hits. This slice covers demons and undead that do not require `new_were()` or vampire-shifter form handling. It leaves werecreature/vampire shape branches and saddle interception deferred.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` routes a hit by a thrown potion to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1625` starts `potionhit(mon, obj, how)`.
- `nethack-c/upstream/src/potion.c:1831` starts the `POT_WATER` monster branch.
- `nethack-c/upstream/src/potion.c:1832` gates the first branch on `mon_hates_blessings(mon) || is_were(mon->data) || is_vampshifter(mon)`.
- `nethack-c/upstream/src/potion.c:1834` through `potion.c:1841` make blessed water print pain, wake nearby non-silent targets, deal `d(2,6)`, and kill dead targets.
- `nethack-c/upstream/src/potion.c:1845` through `potion.c:1850` make cursed water non-angering, visibly healthier, and heal `d(2,6)` capped by `healmon()`.
- `nethack-c/upstream/src/potion.c:1897` applies the surviving-monster wake/anger tail.
- `nethack-c/upstream/src/mondata.c:533` through `mondata.c:540` define blessing-haters as vampire shifters, undead, or demons.

## JS Findings

- `js/cmd.js` previously reused a broad deadbook-undead predicate for water gating. That predicate includes golems, which is correct for the Book of the Dead but too broad for C's `hates_blessings()`.
- The new special-water gremlin/iron-golem path already handles iron golems before ordinary water fallback, so the blessing-hater helper needed a C-shaped undead/demon predicate that does not treat all golems as undead.
- Were and vampire naming/forms still lack a reusable JS `new_were()` equivalent, so this slice excludes those targets and preserves the explicit direct-hit deferral.

## Implementation

- Tightened `monsterHatesBlessingsForWaterHit()` to demons, vampire shifters, and C-shaped undead names/classes rather than the broader deadbook helper.
- Added `isBlessingHaterWaterPotionHit()` for unsaddled non-were/non-vampire blessing-haters.
- Added `waterPotionHitBlessingHater()`:
  - blessed water prints `shrieks/writhes in pain`, wakes nearby sleepers for non-silent targets, rolls `d(2,6)`, and kills through the potionhit death helper;
  - cursed water prints `looks healthier`, heals by `d(2,6)` up to max HP, and keeps the monster peaceful;
  - neutral water uses only the shared crash/chip/evaporation path and keeps default wake/anger behavior.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- blessed direct water damages and angers a water demon;
- cursed direct water heals a water demon without angering it;
- neutral direct water hits an undead target without a special effect but still wakes/angers it;
- were/vampire shape branches remain deferred until form-change parity lands.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='hero-thrown|potionhit|direct vapor|broken potion|monster temporary blindness' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Werecreature `new_were()` reversion/transformation remains deferred.
- Vampire-shifter-specific form handling remains deferred.
- Saddle interception still needs the C `H2Opotion_dip()` object-BUC behavior, wet-saddle messaging, and visibility/knowledge side effects.
- Lit oil still needs reusable `explode_oil()`/burning-oil explosion plumbing.
- Polymorph still needs a broader `bhitm()` object-hit implementation.
