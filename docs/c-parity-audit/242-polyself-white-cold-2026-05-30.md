# C Parity Audit 242: Polyself White Cold Resistance

## Sources

- `nethack-c/upstream/include/objects.h:515` and `nethack-c/upstream/include/objects.h:542`: white dragon scale mail and white dragon scales grant `COLD_RES` through object property metadata.
- `nethack-c/upstream/src/worn.c:96-136` and `nethack-c/upstream/src/worn.c:168-184`: `setworn()` applies an object's `oc_oprop` to the worn slot's extrinsic mask and `setnotworn()` clears that worn-slot source.
- `nethack-c/upstream/include/youprop.h:30-32`: `Cold_resistance` is the union of intrinsic and extrinsic cold resistance.
- `nethack-c/upstream/include/monsters.h:1384-1391` and `nethack-c/upstream/include/monsters.h:1495-1505`: baby white dragons and white dragons carry `MR_COLD`.
- `nethack-c/upstream/src/polyself.c:55-66`: `set_uasmon()` grants `COLD_RES` from cold-resistant form data with `FROMFORM`.
- `nethack-c/upstream/src/polyself.c:637-660` and `nethack-c/upstream/src/polyself.c:2214-2216`: matching white dragon armor can merge into embedded skin instead of being removed.
- `nethack-c/upstream/src/polyself.c:1162-1209` and `nethack-c/upstream/src/do_wear.c:939-957`: breakarm/sliparm fallout clears worn body armor through `Armor_gone()` before destroying or dropping it.
- `nethack-c/upstream/src/sit.c:550-553`: sitting on ice suppresses the cold-feeling message when `Cold_resistance` is active.
- `nethack-c/upstream/src/zap.c:2772-2785` and `nethack-c/upstream/src/zap.c:4440-4448`: self-zapped cold and cold rays use `Cold_resistance` for the hero resistance check.
- `nethack-c/upstream/src/zap.c:5673-5718`: inventory cold/fire item protection comes from active extrinsic equipment or a worn dwarvish cloak; form-only resistance does not provide the 99% equipment-protection chance.

## JS Changes

- Added a shared `heroHasColdResistance()` helper that combines role/intrinsic state, white or baby-white dragon polyself form state, and active cold-resistance inventory sources.
- Routed white dragon mail/scales through the existing dragon armor property metadata so active worn equipment and embedded polyself skin count as cold-resistance sources.
- Reused the shared helper for sitting on ice, self-zapped cold wands/frost horns, and hero-hit cold rays.
- Updated cold inventory protection to reuse the active inventory resistance helper, preserving C's distinction between form/intrinsic cold resistance and extrinsic equipment protection.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- White dragon polyself grants form cold resistance without inventory protection.
- White dragon form cold resistance suppresses the ice chill message while sitting.
- Matching white dragon scales embed as skin and keep cold-resistance inventory protection.
- No-hands polyself clears white dragon scale mail cold resistance before the deferred final drop.
- Small-form polyself drops white dragon scales immediately and clears cold resistance.

## Remaining Gaps

- White dragon armor's additional slow-digestion side effect in `do_wear.c:873-879` is not modeled yet.
- Monster cold-attack paths in `js/allmain.js` still have local cold/frost handling and have not all been routed through this helper.
- Broader `set_uasmon()` property parity remains incomplete beyond currently modeled form antimagic, reflection, and cold-resistance slices.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "white dragon polyself|white dragon cold resistance|white dragon scales clears cold" test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1160/1160` tests passed)
- `node --test test/*.mjs` (`1257/1257` tests passed)
- `npm run score` (`44/44` replay sessions passed)
