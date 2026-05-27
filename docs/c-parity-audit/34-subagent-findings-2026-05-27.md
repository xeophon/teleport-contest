# C Parity Audit 34: Neutral-Water Potion Dip Damage

## Scope

This slice adds the early neutral-water branch of `potion_dip()` for carried objects. It covers direct neutral-water `water_damage()` effects for scroll blanking, blank-scroll no effect, spellbook blanking, acid destruction, potion dilution and further dilution into water, grease protection, rust erosion, towel soaking, and carried container leakage/protection. Potion-potion alchemy recipes and bad-mixture explosion/evaporation paths are covered in Audit 36. Full C `poly_obj()` fidelity, shared water-damage primitives, real `?*` menu rendering, self-potion/Klein-bottle handling, `potionbreathe()` explosion side effects, and deeper potion discovery/type-call behavior remain separate work; broad non-self carried potion menus and bounded polymorph-potion dipping are covered in Audit 35.

## C Source Notes

- `nethack-c/upstream/src/potion.c:1498-1586`: `H2Opotion_dip()` handles all water potion dips. Blessed and cursed water mutate target BUC, while uncursed water calls `water_damage(targobj, 0, TRUE)` for carried targets and treats any non-`ER_NOTHING` result as a consumed source potion.
- `nethack-c/upstream/src/potion.c:2460-2467`: water-potion handling runs before polymorph, alchemy, poison, acid, oil, and horn/amethyst neutralization. A successful `H2Opotion_dip()` calls `poof(potion)` and takes time.
- `nethack-c/upstream/src/potion.c:2608-2612`: towels are special after `H2Opotion_dip()`: `water_damage()` wets the towel but returns `ER_NOTHING`, then the towel branch still consumes the water with `The towel soaks it up!`.
- `nethack-c/upstream/src/trap.c:4712-4851`: `water_damage()` orders effects as lit-object splash, can-of-grease no-op, towel wetting, grease protection, container leakage/waterproof feedback, optional luck protection when not forced, readable blanking, acid destruction, potion dilution, and rust erosion.
- `nethack-c/upstream/src/trap.c:4751-4770`: containers consume the applied water even when waterproof and not actually damaged, because the visible feedback teaches the player about water/container behavior.

## JS Status

- `js/cmd.js:11582-11592`: neutral water is now recognized as a carried potion source for the same non-coin target set as blessed/cursed water.
- `js/cmd.js:11876-11942`: neutral-water target handling mirrors the C order for can-of-grease, towel, grease-aware item damage, and container leakage/protection, then consumes the source only on C-style successful effects.
- `js/cmd.js:11944-11947`: water-potion dispatch routes neutral water before the blessed/cursed BUC branch, preserving the C ordering within the local potion matrix.
- `js/cmd.js:29780-29785`: acid destruction through carried water damage now uses inventory use-up handling so unpaid acid can leave the same used-up bill evidence as other destroyed carried shop goods.
- `test/shop-billing-helpers.test.mjs:4275-4505`: focused regression coverage exercises scrolls, blank scrolls, spellbooks, unpaid acid, potion dilution, grease protection, rustable weapons, towels, leaking sacks, and greased sacks.

## Remaining Follow-Ups

- Neutral water still reuses local rust-trap/floor-effect helpers instead of a fully shared C-shaped `water_damage()` primitive. That is acceptable for this slice but should eventually move under the broader trap/liquid/material-damage subsystem.
- Full source/target menu parity remains incomplete. The JS source list now exposes neutral water broadly for carried targets, but unsupported branches still fall through to `Interesting...` rather than using a complete C `getobj()` matrix.
- Audit 36 covers the first potion-potion alchemy slice with recipes, affected stack splitting, instability, mutation, and evaporation. Remaining alchemy work is `potionbreathe()` side effects, exact object-registry metadata, fumbling drop behavior, and complete altered-target shop repricing.
