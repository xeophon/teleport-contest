# C Parity Audit 243: Polyself White Slow Digestion

## Sources

- `nethack-c/upstream/include/objects.h:515` and `nethack-c/upstream/include/objects.h:542`: white dragon scale mail and white dragon scales still list `COLD_RES` as their object property; slow digestion is handled as a special white-dragon side effect.
- `nethack-c/upstream/src/do_wear.c:873-879`: `dragon_armor_handling()` sets `ESlow_digestion |= W_ARM` when white dragon scales or scale mail are worn and clears the same worn-slot bit when they come off.
- `nethack-c/upstream/include/youprop.h:289-291`: `Slow_digestion` is the union of intrinsic and extrinsic slow digestion.
- `nethack-c/upstream/src/eat.c:3161-3179`: ordinary per-move and melee hunger decrements are skipped while `Slow_digestion` is active.
- `nethack-c/upstream/src/eat.c:3223-3235`: slow digestion from non-ring sources still consumes nutrition on the accessory hunger `case 0`; a worn ring of slow digestion suppresses that extra armor hunger.
- `nethack-c/upstream/src/polyself.c:637-660` and `nethack-c/upstream/src/polyself.c:2214-2216`: matching dragon armor merges into `uskin` instead of being unworn, so its worn-slot effects persist while embedded as skin.
- `nethack-c/upstream/src/polyself.c:1162-1209`, `nethack-c/upstream/src/do_wear.c:939-957`, and `nethack-c/upstream/src/worn.c:168-184`: forced armor loss routes through `Armor_gone()`, `setnotworn()`, and `dragon_armor_handling(..., FALSE)`, clearing both the ordinary object property and white-dragon slow digestion.

## JS Changes

- Added `slowDigestion` to the white dragon armor metadata while preserving its ordinary cold-resistance object property.
- Added `heroHasSlowDigestion()` and `applyHeroOrdinaryHunger()` so movement and melee hunger share the C `Slow_digestion` gate.
- Modeled the C accessory hunger special case: white dragon armor still burns nutrition on accessory roll `0`, while a worn ring of slow digestion suppresses both ordinary and accessory slow-digestion hunger.
- Reused active inventory extrinsic handling so worn white dragon armor and matching embedded dragon skin provide slow digestion, and existing forced-removal fallout clears it with the armor.

## Tests

Added or extended focused coverage in `test/shop-billing-helpers.test.mjs`:

- Worn white dragon scale mail grants slow digestion, suppresses ordinary hunger, and still burns nutrition on accessory roll `0`.
- Worn ring of slow digestion suppresses ordinary hunger and the accessory roll `0` slow-digestion armor penalty.
- Worn white dragon scales grant slow digestion.
- White dragon polyself form alone grants cold resistance but not slow digestion.
- Matching white dragon armor embedded as skin keeps slow digestion.
- No-hands and small-form forced white dragon armor removal clear slow digestion along with cold resistance.

## Remaining Gaps

- Digest combat and monster stomach behavior still need separate source-backed coverage for slow-digestion interactions.
- Enlightenment/status display of slow digestion is covered separately in `docs/c-parity-audit/244-slow-digestion-enlightenment-2026-05-30.md`.
- Broader `set_uasmon()` property parity remains incomplete beyond currently modeled form antimagic, reflection, and cold-resistance slices.

## Verification

- `node --check js/cmd.js`
- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "slow digestion|white dragon cold resistance|white dragon polyself|white dragon scales clears cold" test/shop-billing-helpers.test.mjs` (`11` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1163/1163` tests passed)
- `node --test test/*.mjs` (`1260/1260` tests passed)
- `npm run score` (`44/44` replay sessions passed)
