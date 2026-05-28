# Subagent Findings 77: Direct Water Shapechanger Potionhit

## Scope

Implement direct hero-thrown potion of water body hits for werecreatures and vampire shifters. This slice replaces the prior miss/defer behavior for those targets while preserving the existing saddle-first, chip-damage, evaporation, wake/anger, and vapor-tail ordering.

## Upstream C Anchors

- `nethack-c/upstream/src/potion.c:1623` starts `potionhit()`.
- `nethack-c/upstream/src/potion.c:1644` through `potion.c:1650` run saddle interception before body effects.
- `nethack-c/upstream/src/potion.c:1675` applies the common `rn2(5)` monster HP chip before potion-specific body effects when the saddle was not hit.
- `nethack-c/upstream/src/potion.c:1831` through `potion.c:1855` handle `POT_WATER` for blessing-haters, `is_were(mon->data)`, and `is_vampshifter(mon)`.
- `nethack-c/upstream/src/potion.c:1834` through `potion.c:1846` make blessed water print pain, wake nearby if not silent, deal `d(2,6)`, kill if lethal, and call `new_were()` for surviving non-human werecreatures.
- `nethack-c/upstream/src/potion.c:1847` through `potion.c:1854` make cursed water non-angering, visibly healthier, heal `d(2,6)`, and call `new_were()` for human werecreatures when the hero lacks Protection from Shape Changers.
- `nethack-c/upstream/src/potion.c:1897` through `potion.c:1901` apply the surviving-target wake/anger tail.
- `nethack-c/upstream/src/potion.c:1906` through `potion.c:1911` still apply the shared hero vapor or `trycall()` tail after the monster effect.
- `nethack-c/upstream/src/were.c:48` through `were.c:64` define the bidirectional `counter_were()` map.
- `nethack-c/upstream/src/were.c:96` through `were.c:124` define `new_were()`: swap monster data, print a visible non-hallucinated change message, clear helpless state, heal one quarter of lost HP, refresh glyph/equipment, and preserve individual peace/tameness.
- `nethack-c/upstream/include/monst.h:217` defines `is_vampshifter()`.
- `nethack-c/upstream/src/mon.c:2886` and `mon.c:3096` show that lethal hits on shifted vampire forms can revive to base vampire through the monster-death path.

## JS Findings

- `heroThrownPotionHitMonster()` already owns the C-shaped direct hit path, including crash text, common chip damage, evaporation, wake/anger, adjacent vapor, and shop debt.
- `monsterIsWereOrVampireForWaterHit()` identified the missing targets, but `supportsHeroThrownPotionHit()` excluded them through the existing water predicates, so water throws fell through to the generic miss/landing path.
- JS already had were-beast form data for hero/wish paths and vampire shifter state for monster turn-time shifting, but no reusable monster `new_were()` equivalent.

## Implementation

- Added `isShapechangerWaterPotionHit()` and included it in direct thrown-potion support.
- Removed the previous real-saddle exclusion for shapechangers so C's saddle-first ordering can apply; if the saddle roll misses, the body branch now runs.
- Added a water-local `new_were()` equivalent:
  - maps `wererat`, `werejackal`, and `werewolf` between human and beast forms;
  - prints `changes into a human/rat/jackal/wolf` only when visible and not hallucinating;
  - preserves HP max and heals one quarter of lost HP;
  - clears helpless state when transforming a helpless monster;
  - preserves individual peaceful/tame state and leaves broader armor/unwield details deferred.
- Added `waterPotionHitShapechanger()`:
  - blessed water damages were/vampire shifters and reverts surviving beast-form weres;
  - cursed water heals without angering and transforms human-form weres into beast form unless the hero has Protection from Shape Changers;
  - vampire shifters do not get a nonlethal water-specific shape change, matching C.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- blessed water damages and reverts a werewolf beast form to human form;
- cursed water heals and transforms a human werewolf into wolf form without angering it;
- cursed water heals a vampire bat shifter without changing its form;
- existing blessing-hater, saddle, gremlin, and iron-golem direct water tests still pass.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='hero-thrown.*water potion|special-water|werecreatures|vampire shifters|were-beast' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Lethal hits on shifted vampire bat/fog/wolf forms should revive to base vampire through a shared monster-death `vamprises()` path; this slice leaves that broader death-lifecycle behavior deferred.
- `new_were()` armor breakage, monster unwielding, and movement/scare side effects are still broader monster-equipment follow-ups.
- Numeric PM-index `cham`/were mappings remain deferred; this slice uses the JS string/object flags already present in current monster tests and factories.
- Exact non-`kn` `trycall()` prompting and broader direct-potion bash delivery remain open.
