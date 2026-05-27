# C Parity Audit 40: Hot-Ground Broken Potion Vapor

## Implemented Slice

This slice adds the C `breakobj()` vapor side effect to potions that shatter when they land on very hot room or corridor ground. JS already modeled the hot-ground survival roll, shatter message, removal, and used-up shop billing, but it removed the potion without applying `potionbreathe()`.

The implementation calls the shared `brokenPotionBreathe()` helper after the hot-ground shatter message and before the object removal path. It also keeps the visible heat message in C's definite-subject shape (`The potion...`) and preserves the carried object's former inventory letter as `invlet` for the C Luck-adjusted survival check. This preserves the C ordering where the visible heat/shatter text comes first, then `breakobj()` applies nearby vapor effects, then object deletion and shop state cleanup happen.

## C Anchors

- `nethack-c/upstream/src/do.c:318-352`: floor effects for potions on hot room/corridor ground print the heat message, roll `obj_resists()` with the C survival chance, print the shatter/heard message, then call `breakobj(obj, x, y, FALSE, FALSE)`.
- `nethack-c/upstream/src/dothrow.c:2480-2520`: `breakobj()` handles all potions through the potion branch, marks the object in use, and calls `potionbreathe()` when the hero is adjacent and can breathe or has eyes.
- `nethack-c/upstream/src/dothrow.c:2502-2517`: broken-potion vapor uses the `next2u(x, y)` adjacency gate, wet towel shielding, and the generic smell or eye-watering prelude for non-water potions.
- `nethack-c/upstream/src/do.c:337-345`: oil potions survive hot ground, and blessed/inventory-letter potions use the adjusted survival chance before `breakobj()`.

## JS Notes

- `js/cmd.js:318-334`: ordinary carried drops retain `invlet` from the inventory letter before the JS floor object clears its menu letter.
- `js/cmd.js:8370-8380`: floor heat wording now has a definite-subject helper for the C `Tobjnam()` shape.
- `js/cmd.js:8726-8743`: `hotGroundPotionFloorEffect()` now uses the definite heat subject, recognizes `letter`/`invlet` for Luck-adjusted survival, and calls `brokenPotionBreathe(obj, x, y, messages)` after the shatter message and before `destroyObject(obj)`.
- `js/cmd.js:12149-12155`: the shared helper supplies the C-style adjacency, wet towel, smell/eyes, and existing vapor-effect behavior.
- `test/shop-billing-helpers.test.mjs:8763-8785`: carried unpaid confusion potion dropped onto hot ground now preserves the used-up bill row and applies the confusion vapor side effect.
- `test/shop-billing-helpers.test.mjs:11625-11645`: shop-floor contained confusion potion tipped onto hot ground now preserves the used-up bill row and applies vapor.

## Remaining Follow-Ups

- Audit 41 covers inventory fire potion vapor, which C routes through `maybe_destroy_item()` and direct `potionbreathe()` without the broken-potion smell prelude.
- Add forced chest-content potion shattering with direct `potionbreathe()` and potion-specific shatter wording.
- Keep lava/floor fire boil, cold destruction, electrical destruction, random/non-hero migration, and generic object deletion no-vapor unless a C caller explicitly reaches `breakobj()` or `potionbreathe()`.
