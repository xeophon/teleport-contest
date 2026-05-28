# Subagent Findings 80: Generic Potionhit Saddle Interception

## Scope

Broaden direct hero-thrown `potionhit()` worn-saddle interception from the special water/oil/polymorph cases to every currently supported direct potion identity. This slice also fixes the common chip-damage RNG ordering on saddle hits.

## Upstream C Anchors

- `nethack-c/upstream/src/dothrow.c:2262` through `dothrow.c:2265` route a successful hero-thrown potion hit to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1644` through `potion.c:1650` roll saddle interception before all potion identity effects. Any potion can hit the worn saddle via `!rn2(10)`; water has extra cursed/blessed/neutral chances after that generic miss.
- `nethack-c/upstream/src/potion.c:1675` still consumes the common `rn2(5)` chip roll before `!hit_saddle` prevents HP loss.
- `nethack-c/upstream/src/potion.c:1679` skips visible evaporation text on saddle hits.
- `nethack-c/upstream/src/potion.c:1706` through `potion.c:1726` enter the saddle branch instead of the monster-effect switch. Water calls `H2Opotion_dip()`, polymorph deliberately does nothing, and all other potion identities fall through to the visible saddle-wet message.
- `nethack-c/upstream/src/potion.c:1897` keeps wake/anger inside the non-saddle monster branch, so saddle hits leave the monster asleep/peaceful.
- `nethack-c/upstream/src/potion.c:1906` through `potion.c:1911` still run vapor/trycall after saddle handling, followed by shop billing and object cleanup.

## JS Findings

- `isSaddlePotionHit()` only admitted water, oil, and polymorph. That meant a direct supported potion like confusion or sickness could never use C's generic 10% saddle interception.
- Simply treating any worn saddle as direct-potionhit support would over-broaden unknown/unsupported potion appearances: a missed saddle roll would then fall through an unimplemented body-effect path.
- Water needs a special support exception. Blessed or cursed water on an ordinary saddled monster can have no monster body effect but still has a real saddle `H2Opotion_dip()` effect.
- `heroThrownPotionHitMonster()` skipped the chip `rn2(5)` entirely on saddle hits. C consumes the roll and only suppresses the HP decrement.

## Implementation

- Split the direct support predicate into `supportsHeroThrownPotionBodyHit()` plus the public `supportsHeroThrownPotionHit()` gate.
- Reworked `isSaddlePotionHit()` so a worn saddle is eligible for:
  - any water potion, because the saddle branch itself has water BUC handling;
  - any other direct potion identity whose body path is already implemented.
- Left unsupported potion appearances outside the direct `potionhit()` route unless they already resolve to a supported effect by name or potion index.
- Changed the common hit logic to consume `rn2(5)` whenever the target has more than 1 HP, then skip the HP decrement if the saddle was hit.
- Kept saddle hits skipping evaporation, monster effects, and wake/anger, while preserving the existing vapor/trycall and shop-billing tail.

## Tests

Focused coverage in `test/shop-billing-helpers.test.mjs` now checks:

- a hero-thrown confusion potion can hit a worn saddle, wet it, skip monster confusion, skip evaporation, leave HP/sleep/peace unchanged, and consume the C-shaped `rn2(10)` then `rn2(5)` rolls;
- the same confusion potion can miss the saddle, hit the monster head, evaporate, consume the chip roll, apply the monster resistance roll, confuse the monster, and wake/anger it;
- existing water/oil/polymorph saddle tests now assert the consumed chip `rn2(5)` on saddle hits.

Focused verification:

- `node --test --test-reporter=spec --test-name-pattern="saddle|hero-thrown confusion potion" test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Wielded-potion bash delivery is still separate from the successful hero-thrown direct-hit path.
- Exact non-`kn` `trycall()` prompts and full discovery/window behavior remain broader potion delivery work.
- Full burning-oil explosion collateral and full `newcham()` monster lifecycle/equipment fidelity remain outside this narrow saddle slice.
