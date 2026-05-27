# C Parity Audit 24: Potion-of-Oil Weapon Oiling via #dip

## Scope

This slice covers generic potion-of-oil dipping for carried weapons and C weapon-tools. It intentionally does not port the full `potion_dip()` matrix: water, potion mixing, acid/corrosion outside oil, poison coating, unicorn horn/amethyst mixtures, `#altdip`, and exact fire damage for lit oil remain separate work.

## C Source Notes

- `nethack-c/upstream/src/potion.c:2267-2376`: `dodip()` selects the target first, offers local floor features such as fountains before inventory potion sources, then prompts `What do you want to dip <object> into?`.
- `nethack-c/upstream/src/potion.c:2645-2685`: potion of oil is handled before lamp refueling. Lit oil burns, cursed oil spills on fingers/gloves and makes hands slippery, and uncursed non-lit oil affects only `WEAPON_CLASS` objects and `is_weptool()` objects.
- `nethack-c/upstream/src/potion.c:2654-2679`: eligible rusty/corroded non-ammo weapons and weapon-tools decrement `oeroded` and/or `oeroded2` by one and print the "less rusty/corroded" message. Clean, non-rustprone, or ammo objects consume the oil and only get the oily-sheen/feel-oily message; they are not greased.
- `nethack-c/upstream/src/potion.c:2681-2684`: generic weapon oiling identifies oil only when `dknown`, calls `useup(potion)`, and returns a turn.
- `nethack-c/upstream/src/shk.c:5688-5741`: unlike lamp refueling, the generic oil branch does not call `check_unpaid()`, so unpaid oil weapon use has no Yendorian Fuel Tax and only preserves the consumed potion through ordinary `useup()`/`obfree()` billing.

## JS Status

- `js/cmd.js:7421-7430` now shares the C-style dip prompt article/short-name formatting between fountain and oil-source prompts.
- `js/cmd.js:11469-11540` adds the generic oil target predicate, weapon/tool repair logic, cursed-oil slippery-hands path, no-grease oily-sheen path, and useup-only billing.
- `js/cmd.js:44085-44235` keeps the existing fountain prompt first for weapon targets, then asks the oil-source prompt only after the player declines with `n`, matching the C prompt order for local features before carried potion sources.
- `test/shop-billing-helpers.test.mjs:3261-3428` covers rusty weapon repair without Fuel Tax, dual rust/corrosion repair, clean weapon no-grease consumption, pick-axe weapon-tool repair, unpaid stack residual billing without debit, and cursed oil spilling before repair.

## Remaining Follow-Ups

- Exact `fire_damage()` behavior for lit oil and lit targets.
- Later audits cover broad non-self carried potion menus, source-first `#altdip`, water, acid, poison coating, horn/amethyst, bounded polymorph effects, potion-potion alchemy recipes/bad mixtures, and alchemy-explosion vapor effects. Remaining generic potion work is thrown/broken potion vapor delivery, non-`kn` `trycall()` prompt parity, water vapor gremlin/lycanthropy transformations, full `poly_obj()` fidelity, shared damage/discovery primitives, self-potion/Klein-bottle handling, exact status-property mapping, and real `?*` menu rendering.
