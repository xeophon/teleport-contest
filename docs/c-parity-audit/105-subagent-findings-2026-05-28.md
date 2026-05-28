# Subagent Findings 105 - Upward Acid And Unlit Oil Self-Hit

## Implemented Slice: Acid And Unlit Oil In `potionhit(&youmonst)`

Broadened the upward hero-thrown potion self-hit path to cover two remaining C-shaped self cases: potion of acid and unlit potion of oil. The shared upward wrapper still follows `toss_up()` ordering: ceiling/self-hit roll, random bottle name, `rnd(2)` head damage, potion-specific direct self effect, vapor/trycall handling, shop debt conversion, and cleanup.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward non-returning throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1284`: `toss_up()` prints the fall-back-on-head message.
- `nethack-c/upstream/src/dothrow.c:1289`: upward potions call `potionhit(&gy.youmonst, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1636`: self `potionhit()` prints the random bottle crash.
- `nethack-c/upstream/src/potion.c:1638`: self `potionhit()` applies `Maybe_Half_Phys(rnd(2))` head damage with "thrown potion" as the killer.
- `nethack-c/upstream/src/potion.c:1679`: non-oil self hits evaporate before direct special effects.
- `nethack-c/upstream/src/potion.c:1694`: acid self-hit checks `Acid_resistance`, prints `This burns...`, rolls `d(cursed ? 2 : 1, blessed ? 4 : 8)`, and uses "potion of acid" as the killer.
- `nethack-c/upstream/src/potion.c:1685`: oil self-hit only calls `explode_oil()` when `lamplit`; unlit oil has no evaporation and no direct damage.
- `nethack-c/upstream/src/potion.c:1906`: distance-zero self hits always attempt `potionbreathe()` when the hero can receive vapor.
- `nethack-c/upstream/src/potion.c:2092`: acid and polymorph vapor only exercise constitution and then may `trycall()`.
- `nethack-c/upstream/src/potion.c:2103`: oil has no vapor effect case and may still `trycall()`.
- `nethack-c/upstream/src/potion.c:1913`: unpaid hero-thrown potions convert to `stolen_value()` after direct effects and vapor.

Covered JS behavior:

- `js/cmd.js`: upward support now permits acid and unlit oil while keeping polymorph and lit oil gated off.
- `js/cmd.js`: acid self-hit applies the direct burn message and acid damage before the existing vapor and shop-debt tail.
- `js/cmd.js`: acid resistance skips the direct burn and damage branch while still leaving the crash, evaporation, vapor exercise, and cleanup path intact.
- `js/cmd.js`: unlit oil self-hit uses the common crash/head-damage/cleanup path without an evaporation message or explosion.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: upward acid self-hit burns the hero after evaporation, consumes the potion, and follows the expected RNG shape through `d(1,8)` and vapor exercise.
- `test/shop-billing-helpers.test.mjs`: upward acid self-hit respects hero acid resistance and skips the acid damage roll.
- `test/shop-billing-helpers.test.mjs`: upward unlit oil self-hit consumes the potion without evaporation, odor, or explosion and only consumes the ceiling/bottle/head-damage RNG calls.

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Polymorph self-hit needs `You feel a little strange/normal`, unchanging/antimagic gates, and `polyself()` fallout before vapor.
- `Maybe_Half_Phys()` mitigation is not modeled for the covered head/acid damage path yet.
- No-ceiling/underwater wording, non-potion upward impacts, cream pies, petrifying eggs/corpses, and heavier falling-object damage remain separate C-backed slices.
