# Takeoff `select_off()` Blockers

Date: 2026-06-09

## C anchors

- `nethack-c/upstream/src/do_wear.c:1771` `armor_or_accessory_off()` blocks covered body armor and shirts for `T`/`R` before `select_off()`.
- `nethack-c/upstream/src/do_wear.c:2696` `select_off()` applies runtime blockers for rings, gloves, boots, body armor, and shirts.
- `nethack-c/upstream/src/do_wear.c:1893` `cursed()` remains the generic final curse refusal after the special blockers.

## JS changes

- Added `T`/`R` covered-armor refusals for body armor under cloak, shirts under cloak/suit, and embedded skin armor.
- Added shared `select_off()`-style blockers for:
  - rings stuck on no-hands forms,
  - primary-hand rings blocked by welded weapons,
  - rings blocked by cursed or slippery gloves,
  - gloves blocked by welded weapons or slippery hands,
  - boots blocked by bear traps or stuck-in-floor state,
  - `A`-selected body armor/shirts blocked by cursed cloak/suit or welded two-handed weapons.
- Kept `A` on the `select_off()` path without the extra `T`/`R` covered-armor wrapper, matching the C call split.

## Tests

- Focused tests cover ring/glove/weld blockers, no-hands ring removal, slippery gloves, bear-trapped boots, covered `T`, and `A`-selected cursed cloak / welded two-handed weapon blockers.

## Remaining gaps

- The petrifying-corpse glove-removal prompt from `better_not_take_that_off()` is still not modeled.
- Generic `cursed()` slippery-fingers retry wording is not fully ported for every worn item/weapon case.
- `TT_LAVA` boot removal remains intentionally unblocked here because the C `select_off()` boot removal branch only checks `TT_INFLOOR`; lava-specific boot effects need a separate audit.
