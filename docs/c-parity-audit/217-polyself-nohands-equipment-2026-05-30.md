# C Parity Audit 217: Polyself No-Hands Equipment

## Sources

- `nethack-c/upstream/include/mondata.h:11`, `nethack-c/upstream/include/mondata.h:52`, `nethack-c/upstream/include/mondata.h:123`: `verysmall(ptr)` is `msize < MZ_SMALL`, `nohands(ptr)` checks `M1_NOHANDS`, and `cantwield(ptr)` is exactly `nohands(ptr) || verysmall(ptr)`.
- `nethack-c/upstream/src/polyself.c:887-889`: successful `polymon()` calls `break_armor()`, then `drop_weapon(1)`, then `find_ac()`.
- `nethack-c/upstream/src/polyself.c:1248-1257`: `break_armor()` drops worn gloves for `cantwield()` forms, printing `You drop your gloves%s!` and including `and weapon` when a weapon is wielded.
- `nethack-c/upstream/src/polyself.c:1301`: rings stay worn even when the new form has no hands.
- `nethack-c/upstream/src/polyself.c:1304-1357`, `nethack-c/upstream/src/do.c:663-710`, `nethack-c/upstream/src/wield.c:873-884`: wielded weapons are unwielded and, when `canletgo()` allows, dropped. The explicit `drop_weapon(1)` wording is used only when gloves did not already handle the weapon.
- `nethack-c/upstream/src/polyself.c:1259-1284`: no-hands or very small forms also drop shields, helms, and boots with slot-specific messages.

## JS Changes

- Added a successful-polyself equipment fallout helper keyed from the new monster form's `nohands` and `verysmall` flags.
- Dropped worn gloves plus the wielded weapon together for no-hands/verysmall forms, preserving C's combined `You drop your gloves and weapon!` message.
- Left worn rings in inventory with their worn hand unchanged.
- Routed these forced drops through the shared carried-object floor-drop helper instead of direct array mutation, so floor effects, inventory removal, and shop drop plumbing use the ordinary drop path.
- Replaced the old body-armor overload follow-up's hardcoded inventory letters with queued object references from the successful-polyself fallout helper.
- Added modeled shield, helm, and boots fallout in the same helper so follow-up slices can cover those slots without another ad hoc path.
- Recomputed the polymorphed hero's armor class after immediate forced equipment drops in this no-body-armor row, matching the C `find_ac()` tail after `break_armor()`.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Debug successful polyself into a `wererat` while wearing leather gloves, wielding a dagger, and wearing a ring of protection.
- Assert the hero becomes a wererat, the gloves and dagger leave inventory and land on the hero square, and the ring remains worn in inventory.
- Assert the resulting armor class stays at the wererat's base AC after the gloves are dropped.

## Remaining Gaps

- Body armor, cloak, and shirt handling is still only partially C-shaped; exact `breakarm()` and `sliparm()` ordering remains broader.
- The delayed body-armor overload follow-up still uses the legacy replay-visible AC assignment; exact post-drop `find_ac()` for that delayed path remains separate.
- Welded/cannot-let-go weapon handling is not fully modeled; this slice covers the ordinary droppable weapon row.
- Shop sale prompts for forced polyself equipment drops still need explicit shop tests, although this slice routes through the shared carried-drop helper.
- Retouching equipment, cockatrice self-touch after glove loss, artifact effects, dragon armor merge, eyewear without a head, and broader retained-equipment AC recalculation remain open.
- Shield, helm, and boots behavior is implemented in the helper but currently covered only indirectly by code inspection, not by focused regression tests.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="successful no-hands polyself|self-(cast|zapped) polymorph|spell polymorph floor-pile" test/shop-billing-helpers.test.mjs` (`4` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1098/1098` passed)
- `node --test test/*.mjs` (`1195/1195` passed)
- `npm run score` (`44/44` passing)
