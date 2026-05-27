# C Parity Audit 41: Inventory Fire Potion Vapor

## Implemented Slice

This slice adds the C `potionbreathe()` side effect for carried potions destroyed by inventory fire. JS already boiled/exploded carried potions, removed the destroyed quantity, applied explosion damage, and preserved used-up shop bills, but only had an ad hoc invisibility vapor message on one fire-ray path.

The implementation now calls direct `potionBreathe()` after the inventory destruction message is prepared and before `useUpInventoryItem()`. It deliberately does not call `brokenPotionBreathe()`, because C inventory fire does not print the broken-potion "peculiar odor" or eye-watering prelude. Fire-ray deferred message events now carry follow-up vapor messages while keeping potion explosion damage on the parent destruction event, which matches the C/public screen boundary where the status line is already updated when the vapor `--More--` screen is displayed.

## C Anchors

- `nethack-c/upstream/src/zap.c:5903-5917`: `maybe_destroy_item()` prints the carried inventory destruction message, then calls `potionbreathe(obj)` for fire-destroyed carried potions when the hero can breathe or has eyes.
- `nethack-c/upstream/src/zap.c:5929-5935`: the destroyed quantity is consumed after the vapor call; item explosion damage is applied after use-up.
- `nethack-c/upstream/src/potion.c:1938-1949`: `potionbreathe()` marks the potion in use and wet worn towels intercept the vapor with `Some vapor passes harmlessly around you.`
- `nethack-c/upstream/src/potion.c:1989-2001`: confusion and booze vapor print the dizziness message and increment confusion.
- `nethack-c/upstream/src/invent.c:1312-1321` and `nethack-c/upstream/src/shk.c:1224`: final carried object use-up routes through `obfree()` so unpaid shop bills become used-up rows instead of debit.

## JS Notes

- `js/cmd.js:8893-8919`: `fireDamageInventory()` now collects direct vapor messages for destroyed potions, calls `potionBreathe(item, vaporMessages)` before `useUpInventoryItem()`, and appends the vapor messages after the boil/explode line.
- `js/cmd.js:39352-39368`: fire-ray inventory destruction follow-ups now preserve nested vapor messages and account for damage attached to parent or nested follow-up events.
- `test/shop-billing-helpers.test.mjs:2946-2973`: unpaid carried confusion potion destroyed by inventory fire now boils/explodes, applies confusion vapor, removes the potion, and preserves the used-up bill row.
- `test/shop-billing-helpers.test.mjs:2975-2996`: a wet worn towel blocks inventory-fire potion vapor and prevents the confusion side effect.

## Fresh Follow-Up Audits

- Direct `potionhit()` delivery remains a larger missing subsystem. C handles hero-thrown potion hits, wielded potion bashes, monster-thrown hero hits, direct monster effects, and acid through iron bars in `potion.c`, `dothrow.c`, `uhitm.c`, and `mthrowu.c`; current JS mostly routes hero-thrown potions through landing/breakage and has only bespoke monster-thrown hero effects.
- Audit 43 implements gremlin-only water vapor. C `POT_WATER` in `potionbreathe()` calls the gremlin split only when the hero is in gremlin form and the wet towel gate did not intercept the vapor; lycanthropy is a separate later branch.
- Statue shatter shop debt remains a compact non-potion follow-up. C `animate_statue()` charges `stolen_value()` before moving statue contents to the animated monster; JS still moves contents directly.

## Remaining Follow-Ups

- Add forced chest-content potion shattering with direct `potionbreathe()` and potion-specific shatter wording.
- Add broader lycanthropy water vapor transformations separately.
- Add direct `potionhit()` thrown/bash delivery as a separate, larger potion subsystem slice.
- Keep lava/floor fire boil, cold destruction, electrical destruction, random/non-hero migration, and generic object deletion no-vapor unless a C caller explicitly reaches `breakobj()` or `potionbreathe()`.
