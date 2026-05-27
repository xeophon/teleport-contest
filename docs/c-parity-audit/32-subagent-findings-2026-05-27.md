# C Parity Audit 32: Blessed and Cursed Water Through #dip

## Scope

This slice adds the bounded `H2Opotion_dip()` branch for carried-object potion `#dip`: blessed water can uncurse or bless a target, cursed water can unbless or curse a target, and the source water is consumed only when the target BUC state actually changes. Neutral water damage was implemented afterward in Audit 34; unicorn horn/amethyst neutralization in Audit 33; broad non-self carried potion menus plus bounded polymorph potion dipping in Audit 35; potion-potion alchemy recipes/bad mixtures in Audit 36; and alchemy-explosion vapor effects in Audit 37. Shared water-damage primitives, self-potion/Klein-bottle handling, thrown/broken potion vapor delivery, non-`kn` `trycall()` prompt parity, water vapor gremlin/lycanthropy transformations, and deeper discovery/type-call behavior remain separate work.

## C Source Notes

- `nethack-c/upstream/src/potion.c:1498-1586`: `H2Opotion_dip()` handles water-specific target effects. Blessed water uncurses cursed targets with an amber glow or blesses unblessed targets with a light blue aura. Cursed water unblesses blessed targets with a brown glow or curses uncursed targets with a black aura.
- `nethack-c/upstream/src/potion.c:1536-1545`: neutral water routes to `water_damage()` for carried targets and can identify water when the water-damage message mentions it.
- `nethack-c/upstream/src/potion.c:1552-1566`: visible glow/aura feedback marks the target BUC-known unless hallucinating; unseen changes can clear BUC knowledge unless the water BUC and description are known.
- `nethack-c/upstream/src/potion.c:1570-1583`: unpaid water targets are special because water price depends on BUC. Adding blessed/cursed state uses `alter_cost()`, while removing holy/unholy state uses `costly_alteration()` before the mutation.
- `nethack-c/upstream/src/potion.c:2442-2467`: `potion_dip()` checks water before polymorph, alchemy, poison coating, acid, oil, lamp refuel, and horn/amethyst neutralization. A successful water effect consumes the source potion; a no-effect pair falls through to `Interesting...`.
- `nethack-c/upstream/src/potion.c:2374-2404`: source-first `dip_into()` shares the same `potion_dip()` matrix and skips local fountain/sink/pool prompts.

## JS Status

- `js/cmd.js:11557-11582`: blessed/cursed water is now an eligible source for non-coin carried targets in both target-first and source-first potion dip menus. Neutral water was added later in Audit 34, and broader non-self carried potion menu exposure was added in Audit 35.
- `js/cmd.js:11720-11798`: `dipObjectIntoWaterPotion()` implements the four blessed/cursed water BUC transitions, visible glow/aura messages before mutation, target BUC learning/forgetting, source consumption only on successful mutation, and no-consume `Interesting...` for already-best/worst targets.
- `js/cmd.js:11731-11743`: water targets are normalized back to plain water identity and inventory/shop display is refreshed after BUC changes.
- `js/cmd.js:11754-11757` and `js/cmd.js:11792-11796`: unpaid water devaluation uses the existing dummy alteration billing path before state removal, while blessed/cursed price increases refresh the live bill after mutation.
- `js/cmd.js:11840-11845`: water dispatch now runs before acid, oil, and poisonable-weapon potion effects, matching C branch ordering for the implemented matrix.
- `test/shop-billing-helpers.test.mjs:3773-3794` and `test/shop-billing-helpers.test.mjs:3855-4022`: focused coverage verifies source-first holy water over a fountain, uncurse/bless/no-effect holy-water cases, unbless/curse unholy-water cases, source consumption rules, BUC knowledge, used-up shop billing when unblessing unpaid holy water, and residual billing for an unpaid consumed holy-water source stack.

## Parallel Follow-Up Audits

- Unicorn horn and amethyst neutralization: C `mixtype()` maps unicorn horn plus sickness to fruit juice, horn plus hallucination/blindness/confusion to water, and amethyst plus booze to fruit juice. Audit 33 implements the local split-one source stack, `COST_NUTRLZ` billing, mutation, and reinsertion path.
- Stone-to-flesh self-cast: C transforms eligible mineral/gemstone inventory objects into meat ring, meat stick, or meatball and repeatedly merges compatible results. JS still treats stone-to-flesh as a generic healing spell.

## Remaining Follow-Ups

- Neutral-water `water_damage()` through potion `#dip` is covered in Audit 34; shared water-damage primitives and water discovery/type-call behavior remain open.
- Potion-potion alchemy recipes and bad mixtures are covered by Audit 36. Unicorn horn/amethyst neutralization is covered by Audit 33, and bounded polymorph dipping plus broad non-self carried menus/generic no-effect fallback are covered by Audit 35.
- Broader C-shaped target validation now exists for carried non-coin dip targets, but real `?*` menu rendering and full command/menu infrastructure remain open.
