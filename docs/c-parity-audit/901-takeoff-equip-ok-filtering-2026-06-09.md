# Takeoff `equip_ok()` Filtering

Date: 2026-06-09

## C anchors

- `nethack-c/upstream/src/do_wear.c:1731` `count_worn_stuff()` only counts the outermost cloak/suit/shirt layer for `T` auto-selection, while `R` auto-selects only when exactly one accessory is worn.
- `nethack-c/upstream/src/do_wear.c:1771` `armor_or_accessory_off()` reports `You are not wearing that.` for direct selections that are not worn armor/accessory.
- `nethack-c/upstream/src/do_wear.c:3404` `equip_ok()` classifies removal candidates as suggested, downplayed, excluded, or inaccessible:
  - non-worn inventory is inaccessible,
  - wrong-category worn equipment is downplayed,
  - covered body armor/shirts are inaccessible for ordinary `T`/`R`.

## JS changes

- Added `takeOffPromptClass()` and prompt helpers for `T`/`R` suggested vs downplayed selection.
- Updated `T` and `R` auto-selection to use suggested equipment only, matching C's category-specific defaulting.
- Added `?` and `*` support in the `takeOffObject` prompt:
  - `?` shows suggested equipment, or downplayed equipment when there are no suggested items,
  - `*` shows the full inventory.
- Direct inventory letters now distinguish missing inventory from inaccessible inventory:
  - missing letters still report `You don't have that object.`,
  - carried-but-not-worn selections report `You are not wearing that.`,
  - downplayed worn equipment remains directly removable.

## Tests

- Existing `T`/`R` fallback tests now assert C-shaped `[*]` prompts for wrong-category-only equipment.
- Covered body/shirt tests assert ordinary `?` omits inaccessible inner armor while direct letters still reach the C refusal.
- New tests cover non-worn direct selections and downplayed armor/accessory direct removal from `T`/`R`.

## Remaining gaps

- Generic `cursed()` slippery-fingers retry wording remains unported.
- `A` queue handling after a zero-move blocker still needs a dedicated C audit and test.
- The petrifying-corpse glove-removal prompt remains unmodeled.
