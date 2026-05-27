# C Parity Audit 30: Source-First Potion #altdip Through Inventory Action

## Scope

This slice adds the bounded source-first potion item-action path for already implemented `#dip` effects. Non-oil potions selected from the inventory action menu now start a source-first target prompt, skip fountain/sink/pool handling, and reuse the existing oil/sickness/healing/acid effect helpers. Known potion of oil remains on the apply/light path. Blessed/cursed water was added later in audit 32. This intentionally does not implement the full C source menu, potion-potion alchemy, neutral-water damage, unicorn horn/amethyst mixtures, or unsupported generic potion-target pairs.

## C Source Notes

- `nethack-c/upstream/src/iactions.c:159-164`: item action `IA_DIP_OBJ` queues `dip_into` with the selected potion letter.
- `nethack-c/upstream/src/iactions.c:368-375`: known potion of oil is the exception and gets an apply/light action; other potions get `Dip something into this potion`.
- `nethack-c/upstream/src/potion.c:2374-2404`: `dip_into()` is the source-first variant of `#dip`; it validates the selected source with `drink_ok`, skips floor water/features, prompts for the object to dip into that potion, rechecks inaccessible equipment, then calls `potion_dip()`.
- `nethack-c/upstream/src/potion.c:2211-2226`: `dip_ok()` rejects coins and inaccessible equipment as targets.
- `nethack-c/upstream/src/potion.c:2442-2791`: source-first and target-first flows share the same `potion_dip()` effect matrix and turn-cost behavior.

## JS Status

- `js/cmd.js:40915`, `js/cmd.js:40955-40965`: the inventory action menu is now potion-aware, and action `a` on non-oil potions enters source-first `dipIntoTarget`.
- `js/cmd.js:11537-11557`: source-first target lookup and prompt wording reuse the currently implemented potion-effect matrix, while excluding known oil and coin-like acid targets.
- `js/cmd.js:44330-44347`: `dipIntoTarget` skips floor-feature prompts and dispatches selected pairs through `dipObjectIntoPotion()`.
- `test/shop-billing-helpers.test.mjs:3633-3678`: focused coverage verifies non-oil inventory action source-first dipping over a fountain, sickness coating, and known oil applying instead of entering source-first dip.

## Remaining Follow-Ups

- Broad C `drink_ok`/`dip_ok` carried menu parity and generic unsupported no-effect pairs are covered in audit 35; real `?*` menu rendering remains command/menu work.
- Blessed/cursed water BUC effects are covered in audit 32, horn/amethyst in audit 33, neutral-water damage in audit 34, and bounded polymorph dipping in audit 35. Potion-potion alchemy remains separate potion matrix work.
- Poisoned weapon display ordering was handled in audit 31: inventory and `#dip` prompts now use `doname()`-style `poisoned +0 dart`, while coating/removal messages keep `xname()` style `poisoned dart`.
- Stone-to-flesh object transforms remain a separate spell/object-registry slice.
