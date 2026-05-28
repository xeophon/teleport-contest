# Subagent Findings 71: Direct Neutral Water Potionhit

## Scope

Audit and implement the narrow ordinary-target branch for direct hero-thrown neutral water potion hits. This slice only covers unsaddled, non-special monsters where C's `POT_WATER` branch has no monster-specific effect. It deliberately excludes blessed/cursed water against undead, demons, werecreatures, and vampire shifters; gremlin split; iron golem rust; saddle hits; and bash delivery.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` routes a hit by a thrown potion to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1625` starts `potionhit(mon, obj, how)`.
- `nethack-c/upstream/src/potion.c:1653` through `potion.c:1675` handle visible crash wording and the common one-HP shard chip.
- `nethack-c/upstream/src/potion.c:1679` prints visible non-oil evaporation before the monster switch.
- `nethack-c/upstream/src/potion.c:1819` starts the `POT_WATER` monster branch.
- `nethack-c/upstream/src/potion.c:1820` through `potion.c:1849` handle blessed/cursed special monsters, gremlin split, and iron golem rust; ordinary neutral water falls through with no monster-specific effect.
- `nethack-c/upstream/src/potion.c:1897` applies the surviving-monster wake/anger tail.
- `nethack-c/upstream/src/potion.c:1906` applies adjacent hero vapor or description-known `trycall()` after the monster effect.

## JS Findings

- The shared direct `potionhit()` helper already matches the common crash, shard chip, evaporation, wake/anger, consumption, and no-floor-placement ordering for supported potion identities.
- Water could not be safely added as a global common no-effect potion because C has target-dependent effects for several monsters and a separate saddle-hit path before the monster switch.
- A target-aware gate is enough for the smallest parity slice: neutral water, no saddle, and no gremlin/iron-golem/undead/demon/were/vampire target.

## Implementation

- Extended `supportsHeroThrownPotionHit()` to accept the target monster and gate neutral water through `isNeutralOrdinaryWaterPotionHit()`.
- Added conservative target guards for worn saddles and deferred water-special monsters.
- Let gated neutral water use the existing common hit path with no monster-specific branch, preserving C's ordinary-target behavior.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- neutral water against an ordinary visible monster uses the direct `potionhit()` crash path, evaporates, chips HP, wakes/angers, consumes the potion, and leaves no floor object;
- blessed water against a demon does not enter the partial direct water branch and remains deferred for the future special-monster slice.

Focused verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='hero-thrown|potionhit|direct vapor|broken potion|monster temporary blindness' test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Blessed/cursed water special-monster effects still need source-backed damage, healing, transformation, wake-nearby, death, and lycanthropy/vampire-shifter handling.
- Gremlin split and iron golem rust remain unported for direct monster hits.
- Saddle-hit water handling remains deferred because it uses `H2Opotion_dip()` on the saddle before the ordinary monster switch.
- Bash delivery, non-`kn` `trycall()` prompting, and exact adjacent hero vapor coverage remain broader `potionhit()` gaps.
