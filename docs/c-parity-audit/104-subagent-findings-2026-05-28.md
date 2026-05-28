# Subagent Findings 104 - Broader Upward Potion Self-Hit

## Implemented Slice: Non-Special Upward Potion Self-Hit And Throw-Letter Prompting

Broadened the upward hero-thrown potion self-hit path from confusion/booze to the C-compatible non-special vapor-only potion set. The shared wrapper still handles `toss_up()` ordering, bottle crash, `rnd(2)` head damage, evaporation, direct `potionbreathe()` vapor, and shop debt conversion. Direct special self effects for oil, acid, and polymorph remain gated off.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward throws pass `rn2(5) && !Underwater` into `toss_up()`.
- `nethack-c/upstream/src/dothrow.c:1284`: `toss_up()` prints the fall-back-on-head message.
- `nethack-c/upstream/src/dothrow.c:1289`: fallback potions call self `potionhit()`.
- `nethack-c/upstream/src/potion.c:1633`: self `potionhit()` starts with random bottle crash and `rnd(2)` head damage.
- `nethack-c/upstream/src/potion.c:1679`: non-oil self hits evaporate before direct effects and vapor.
- `nethack-c/upstream/src/potion.c:1683`: only oil, polymorph, and acid have direct self-only switch effects.
- `nethack-c/upstream/src/potion.c:1906`: distance-zero self hits always call `potionbreathe()` when the hero can receive vapor.
- `nethack-c/upstream/src/potion.c:1935`: `potionbreathe()` handles wet towel blocking and all vapor effects.
- `nethack-c/upstream/src/potion.c:2111`: vapor discovery uses `makeknown()` only for `kn` effects, otherwise `trycall()`.
- `nethack-c/upstream/src/potion.c:1913`: unpaid hero-thrown potions convert to `stolen_value()` after direct effects/vapor.

Covered JS behavior:

- `js/cmd.js`: upward support now accepts known potion kinds except deferred special `oil`, `acid`, and `polymorph`.
- `js/cmd.js`: `potionBreathe()` is reused for paralysis, hallucination, blindness, sleeping, speed, invisibility, healing-family, restore/gain ability, sickness, water, and common no-effect vapor/trycall behavior.
- `js/cmd.js`: throw-object selection now lets inventory letters `c` and `r` reach `throwObject`/`throwInventory` before global close/read handlers.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: hallucination potion assigned inventory letter `c` can be thrown upward, self-hit, evaporate, and apply momentary-vision vapor without falling into close-command handling.
- `test/shop-billing-helpers.test.mjs`: paralysis potion assigned inventory letter `r` can be thrown upward, self-hit, evaporate, and apply helpless vapor without falling into read-command handling.
- Existing upward tests continue to cover confusion RNG order, unpaid stack billing, and wet worn towel blocking.

## Remaining Upward Throw Gaps

- Acid self-hit needs the direct `This burns...` branch, acid resistance, extra acid damage, and acid death cause before vapor.
- Polymorph self-hit needs `You feel a little strange/normal`, unchanging/antimagic gates, and `polyself()` fallout before vapor.
- Lit oil self-hit and ceiling break need `explode_oil()`/burning-oil fallout. Unlit oil has no direct damage, but is still deferred with oil until the lit branch is wired safely.
- No-ceiling/underwater wording, non-potion upward impacts, cream pies, petrifying eggs/corpses, and heavier falling-object damage remain separate C-backed slices.
