# Natural Elf Inventory Generation

Date: 2026-06-04

## Summary

Natural elf monster inventory generation now follows the C `is_elf(ptr)` weapon table instead of the previous placeholder ordinary/orcish gear. Elf monsters can now receive elven mithril-coats or cloaks, elven leather helms or boots, elven daggers, the runed bow plus runed-arrow launcher branch, elven broadswords, and elven spear plus shield branch. Elven arrows keep normal projectile initialization and `rn2(12)+3` `m_initthrow()` quantity, but unlike orcish arrows they are not hard-poisoned.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/makemon.c:226` through `:251`: `is_elf(ptr)` generates elven mithril/cloak, helm/boots, dagger, then one of the three `rn2(3)` weapon branches.
- `nethack-c/upstream/src/makemon.c:242` through `:243`: the launcher branch gives `ELVEN_BOW` and `m_initthrow(..., ELVEN_ARROW, 12)`.
- `nethack-c/upstream/src/makemon.c:147` through `:160`: `m_initthrow()` overwrites quantity with `rn1(oquan, 3)` and hard-poisons only `ORCISH_ARROW`.
- `nethack-c/upstream/include/objects.h:144` through `:146`: `ELVEN_ARROW` is the `runed arrow`, wood material, bow ammo, and d7 small-monster damage.
- `nethack-c/upstream/include/objects.h:397` through `:399`: `ELVEN_BOW` is the `runed bow`, wood material, and bow launcher.
- `nethack-c/upstream/include/objects.h:180` through `:182`: `ELVEN_SPEAR` is the `runed spear`, wood material, and spear-class weapon.
- `nethack-c/upstream/include/objects.h:663` through `:664`: `ELVEN_SHIELD` appears as the `blue and green shield`.
- `nethack-c/upstream/include/objects.h:716` through `:717`: `ELVEN_BOOTS` appear as `mud boots`.

## JS Changes

- `js/mklev.js`
  - Adds local exact object IDs and display/init handling for natural `ELVEN_ARROW`, `ELVEN_BOW`, and `ELVEN_SPEAR` creation.
  - Adds `mongets()` metadata for elven bow, arrow, spear, dagger, short sword, broadsword, shield, and boots.
  - Extends projectile initialization so exact elven arrows receive the same stack/enchantment/blessing/curse/generic-poison/erosion rolls as ordinary arrows before `m_initthrow()` overwrites quantity.
  - Adds `m_initelven_launcher()` and replaces the natural elf branch with the C `is_elf(ptr)` equipment table.
- `test/mklev-themerooms.test.mjs`
  - Adds production `makemon()` inventory tests for natural elf launcher, broadsword, and spear branches.

## Tests

- `natural elves generate runed launcher ammo instead of plain arrows`
- `natural elves use C elven broadsword and spear branches`

## Verification

- `node --check js/mklev.js`
- `node --check test/mklev-themerooms.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "natural (Uruk-style orcs|elves)" test/mklev-themerooms.test.mjs` - 3 pass, 45 skipped
- `node --test test/mklev-themerooms.test.mjs` - 48 pass
- `node --test test/shop-billing-helpers.test.mjs` - 1614 pass
- `node --test test/*.test.mjs` - 1761 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Natural forest-centaur bow ammo, non-forest centaur crossbow-bolt generation, kobold darts, Keystone Kop cream pies, and broader monster ranged-inventory tables remain separate source-backed slices.
- Runtime launcher selection/wielding parity remains only partially modeled around metadata-backed arrows and bows.
- Full object registry consolidation for exact elven weapons and armor should eventually replace local metadata patches.
