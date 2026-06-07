# 679 - Direct Potionhit Class Route

## C Source

- `nethack-c/upstream/src/dothrow.c:2262-2265` routes any successful hero-thrown `POTION_CLASS` monster hit to `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1625-1681` applies the common potion-hit shell before effect-specific handling: crash text, possible saddle hit, chip damage, and visible non-oil evaporation.
- `nethack-c/upstream/src/potion.c:1706-1727` lets any potion hit a worn saddle through the generic saddle interception; only water/polymorph have additional saddle-specific effect branches.
- `nethack-c/upstream/src/potion.c:1728-1904` applies effect-specific monster branches only after the common shell.
- `nethack-c/upstream/src/potion.c:1906-1927` handles adjacent vapor/trycall tail behavior and consumes the thrown potion.

## Port Notes

- Direct horizontal hero-thrown potion monster hits now gate on `isPotionObject()` instead of requiring a resolved supported effect identity.
- Appearance-only or minimally specified potion fixtures now enter the shared `heroThrownPotionHitMonster()` route and receive C's common crash/chip/wake/consume behavior without inventing an effect-specific branch.
- Worn-saddle interception now accepts any potion-class object. For unidentified non-water/non-polymorph appearances, this produces the common wet-saddle feedback and skips evaporation/effect handling, matching C's generic saddle path.
- Upward self-hit support remains scoped to known potion effects; this slice only broadens direct horizontal monster delivery.

## Tests

- `blind hero-thrown minimally specified potion uses common potionhit route`
- `hero-thrown unidentified potion-class object can hit a worn saddle`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "hero-thrown unidentified potion-class object can hit a worn saddle|blind hero-thrown minimally specified potion uses common potionhit route|hero-thrown common no-effect potions use shared potionhit crash path|hero-thrown common no-effect potion can come from potion index|hero-thrown common no-effect potion can come from concrete otyp|adjacent hero-thrown common no-effect otyp potion offers vapor trycall|hero-thrown confusion potion hitting a saddle wets it and skips confusion|hero-thrown confusion potion can miss the saddle and confuse the monster" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Upward minimally specified potion throws still need a separate C-backed self-hit slice if we decide to model unknown-identity fallback there.
- Broader potion gaps such as full object identity metadata, exact trycall/discovery details for unknown identities, and unsupported broken-potion callers remain outside this direct class-route slice.
