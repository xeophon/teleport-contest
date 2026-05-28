# Subagent Findings 2026-05-28: Direct Potionhit Identity Fallback and Common Vapor Coverage

## Implemented Slice

C routes thrown potion hits by the real object type. `dothrow.c` sends any potion-class object that survives the hit roll into `potionhit()`, and `potionhit()` switches on `obj->otyp` for saddle targeting, body effects, evaporation, wake/anger, vapor exposure, and the final `trycall()` tail. Discovery fields only affect naming and call prompts. Source anchors: `nethack-c/upstream/src/dothrow.c:2497`, `nethack-c/upstream/src/potion.c:1625`, `nethack-c/upstream/src/potion.c:1680`, `nethack-c/upstream/src/potion.c:1730`, `nethack-c/upstream/src/potion.c:1906`, and `nethack-c/upstream/src/potion.c:1909`.

JS direct potion delivery now has a concrete-otyp identity fallback for the supported potion object ids already used by the port's object generation tables. Appearance-only potion objects with a concrete otyp can enter the same direct `potionhit()` path without needing `kind`, `actualKind`, or `potionIndex` to expose the true identity. Existing `potionIndex` identity remains preferred because current JS wish/generated objects can carry compatibility otyp values while storing the actual potion identity in `potionIndex`.

Focused tests now cover an appearance-only paralysis potion with concrete otyp, an appearance-only object-detection potion with concrete otyp using the common no-monster-effect crash path, and an adjacent object-detection hit where C's vapor tail reaches the hero without an effect-specific vapor message and offers an appearance `trycall()`.

## Audit Notes

- `potionbreathe()` in C has no active effect cases for levitation, see invisible, gain level, enlightenment, monster detection, object detection, gain energy, or fruit juice. For those vapors, `kn` remains false and `obj->dknown` reaches `trycall(obj)` rather than `makeknown(obj)`. Source anchors: `nethack-c/upstream/src/potion.c:1932`, `nethack-c/upstream/src/potion.c:2096`, and `nethack-c/upstream/src/potion.c:2111`.
- Adjacent direct vapor still consumes the Dexterity chance roll after the common hit and chip roll. The no-effect vapor cases consume no extra RNG inside `potionbreathe()`.
- The fallback is deliberately not a full object registry. It mirrors the concrete potion ids currently present in JS generation code and leaves missing potion ids for the broader registry/factory work.

## Deferred Follow-Ups

- Full burning-oil explosion collateral remains broader explosion and terrain work.
- Shifted-vampire lethal revival belongs with monster death/lifecycle support.
- Full polymorph `newcham()` target selection, equipment fallout, and lifecycle details still need the monster core.
- The eventual object registry should replace the local potion otyp map and remove the remaining compatibility distinction between otyp and `potionIndex`.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern 'otyp|common no-effect|direct vapor|potionhit|paralysis potion effect can come from concrete' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs`
- `npm run score`
