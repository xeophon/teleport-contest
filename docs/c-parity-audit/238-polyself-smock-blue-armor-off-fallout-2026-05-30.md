# C Parity Audit 238: Polyself Smock and Blue Armor Off Fallout

## Sources

- `nethack-c/upstream/src/polyself.c:805-890`: successful `polymon()` installs the new monster form, then runs `break_armor()`, `drop_weapon(1)`, and `find_ac()`.
- `nethack-c/upstream/src/polyself.c:1163-1173`: `breakarm()` prints `You break out of your armor!`, calls `Armor_gone()`, then destroys body armor with `useup()`.
- `nethack-c/upstream/src/polyself.c:1184-1187`: breakarm alchemy smock fallout prints the knot message, calls `Cloak_off()`, then drops the smock intact.
- `nethack-c/upstream/src/polyself.c:1199-1207`: `sliparm()` prints `Your armor falls around you!`, calls `Armor_gone()`, then drops body armor.
- `nethack-c/upstream/src/polyself.c:1210-1212`: sliparm cloak fallout prints the fall/shrink message, calls `Cloak_off()`, then drops the cloak.
- `nethack-c/upstream/src/do_wear.c:383-424`: `Cloak_off()` clears worn cloak state, and alchemy smock specifically clears acid resistance.
- `nethack-c/upstream/src/do_wear.c:817-825`: blue dragon armor removal clears the armor speed source and prints `You slow down.` when no other very-fast source remains.
- `nethack-c/upstream/src/do_wear.c:939-957`: `Armor_gone()` clears worn armor state before running dragon armor off handling.
- `nethack-c/upstream/src/worn.c:92-96` and `nethack-c/upstream/src/worn.c:168`: worn-state removal clears object property extrinsics before special armor handling.
- `nethack-c/upstream/include/objects.h:521`, `nethack-c/upstream/include/objects.h:548`, and `nethack-c/upstream/include/objects.h:630`: blue dragon armor grants shock resistance; alchemy smock grants poison resistance and has extra acid resistance handling.

## JS Changes

- Blue dragon scale mail/scales now add the C `You slow down.` fallout message when forced off by successful polyself and no other very-fast source remains.
- Deferred overload/body-armor and cloak-only More paths now clear body/cloak worn state immediately at the fallout message, before the eventual floor drop.
- Deferred blue dragon armor fallout clears `fast`, `veryfast`, and `_blueDragonFast` before the More continuation.
- Alchemy smock acid and poison resistance now derive from the currently worn smock, so forced `Cloak_off()`-style state clearing is represented by removing the worn state before drop.
- Added test hooks for acid/poison resistance predicates to assert equipment-derived state without driving unrelated command paths.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Breakarm xorn polyself destroys blue dragon scale mail and places `You slow down.` before cloak fallout.
- No-hands wererat overload fallout clears blue dragon scales speed state before the delayed floor drop.
- Very-small wererat cloak-only fallout clears alchemy smock worn state and smock acid/poison protection before the delayed floor drop.
- Small gnome sliparm fallout drops an alchemy smock and removes smock-derived acid/poison protection.
- Upward acid potion self-hit now treats a worn alchemy smock as acid protection.

## Remaining Gaps

- Matching-dragon merge behavior, where dragon armor becomes skin instead of running `Armor_gone()`, remains open.
- Other dragon armor property-loss messages/effects remain open outside the blue armor speed slice.
- Broader deferred no-hands non-body equipment side effects still need separate source-backed audits.
- Alchemy smock poison attack coverage is predicate-level here; broader poison-delivery command coverage can be expanded separately.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "successful no-hands polyself clears|successful very small polyself clears|successful breakarm polyself breaking blue|successful small polyself dropping alchemy|upward hero-thrown acid potion respects worn alchemy" test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1143/1143` tests passed)
- `node --test test/*.mjs` (`1240/1240` tests passed)
- `git diff --check`
- `npm run score` (`44/44` replay sessions passed)
