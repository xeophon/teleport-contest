# C Parity Audit 220: Polyself Sliparm Shirt

## Sources

- `nethack-c/upstream/src/polyself.c:886-890`: successful `polymon()` restores mismatched dragon skin, calls `break_armor()`, then `drop_weapon(1)`, then `find_ac()`.
- `nethack-c/upstream/src/mondata.c:632-634`: `sliparm()` is true for whirly, small-or-smaller, or noncorporeal forms.
- `nethack-c/upstream/src/mondata.c:640-649`: `breakarm()` is false for slip forms, so small forms take the `sliparm()` branch instead of the destructive armor-break branch.
- `nethack-c/upstream/src/polyself.c:1198-1227`: `sliparm()` fallout order is body armor, cloak, then shirt; small non-whirly forms print `You become much too small for your shirt!`, clear the worn shirt slot, and drop the shirt.

## JS Changes

- Added shirt detection for worn `Hawaiian shirt` and `T-shirt` inventory items in the successful-polyself equipment fallout helper.
- Added a small `polyselfFormSlipsArmor()` predicate for the currently modeled `verysmall`, `whirly`, and `noncorporeal` form flags.
- Added shirt fallout before the no-hands/verysmall gloves, weapon, shield, helm, and boots checks, preserving the C branch ordering for the covered small-form row.
- Reused the existing forced equipment drop path so the shirt leaves inventory, lands on the hero square, and participates in the same floor placement bookkeeping as the other successful-polyself equipment rows.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful polyself into a `wererat` while wearing a `T-shirt` and small shield.
- Assert the shirt slip message precedes the shield drop message.
- Assert both items leave inventory and land on the hero square.

## Remaining Gaps

- General `breakarm()` body armor, cloak, and shirt destruction for large/non-humanoid forms remains open.
- `sliparm()` body armor and cloak ordering is still partially modeled by legacy overload and cloak follow-up paths, not by a complete C-shaped shared branch.
- Mummy wrapping exceptions, alchemy smock knot wording, whirly cloak/shirt messages, and noncorporeal slip rows remain separate follow-ups.
- The delayed overloaded body-armor path still needs explicit focused coverage and shop sale prompt coverage.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="successful very small polyself|successful no-hands polyself|successful no-head polyself" test/shop-billing-helpers.test.mjs` (`4` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1101/1101` passed)
- `node --test test/*.mjs` (`1198/1198` passed)
- `npm run score` (`44/44` passing)
