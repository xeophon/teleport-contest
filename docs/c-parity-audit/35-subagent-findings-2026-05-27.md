# C Parity Audit 35: Potion Dip Menus and Polymorph Potion Dipping

## Scope

This slice broadens carried potion `#dip` and source-first inventory action menus toward C `drink_ok()`/`dip_ok()` behavior, then implements the early polymorph-potion branch of `potion_dip()` for carried inventory objects. It covers non-self non-coin target exposure, source-first floor-feature skipping, polymorph target/source asymmetry, unpolyable object resistance, same-class replacement, source consumption only after non-resistant polymorph attempts, polymorph discovery on changed type, inventory-letter preservation, BUC/quantity/charge/erosion poison carryover where represented locally, conduct counting, and unimplemented ordinary matrix branches falling through to `Interesting...`.

Potion-potion alchemy recipes and bad-mixture explosion/evaporation paths are covered in Audit 36, and alchemy-explosion vapor effects are covered in Audit 37. Full `poly_obj()` fidelity, worn-object side effects, self-potion/Klein-bottle handling, container-content deletion edge cases outside local object representation, shared `water_damage()` consolidation, thrown/broken potion vapor delivery, non-`kn` `trycall()` prompt parity, water vapor gremlin/lycanthropy transformations, exact status-property mapping, and deeper potion description/type-call discovery remain separate work.

## C Source Anchors

- `nethack-c/upstream/src/potion.c:2204-2227`: `dip_ok()` suggests every accessible non-gold inventory object as a dip target.
- `nethack-c/upstream/src/potion.c:2267-2370`: target-first `#dip` prompts for the target first, optionally asks floor-feature questions, then calls `getobj(..., drink_ok, ...)` for potion sources.
- `nethack-c/upstream/src/potion.c:2374-2404`: source-first `#altdip` selects a potion source first, skips fountain/pool/sink prompts, then asks any `dip_ok()` target.
- `nethack-c/upstream/src/potion.c:2448-2503`: `potion_dip()` orders singleton self-potion rejection, hands rejection, water handling, then polymorph before alchemy.
- `nethack-c/upstream/src/potion.c:2468-2502`: the polymorph branch triggers when either target or source is a potion of polymorph. If the target is the polymorph potion, C checks the source object for polymorph resistance; otherwise it checks the target. Resistance prints `Nothing happens.` and does not consume the source. Non-resistant attempts increment `u.uconduct.polypiles`, call `poly_obj(obj, STRANGE_OBJECT)`, identify polymorph and consume the source when the target type changes, or consume the source with `Nothing seems to happen.` when it does not.
- `nethack-c/upstream/src/zap.c:1676-1682`: `obj_unpolyable()` combines hard unpolyable objects with the normal object resistance roll.
- `nethack-c/upstream/include/obj.h:429-432`: hard unpolyable object types include wand/spellbook/potion of polymorph and amulet of unchanging.
- `nethack-c/upstream/src/zap.c:1702-1866`: `poly_obj(..., STRANGE_OBJECT)` picks from the source object class, preserves quantity, no-charge state, inventory letter, charges for charged classes, BUC, selected erosion/poison/trap fields, deletes new container contents, may collapse large/nonmergeable stacks to one item, and avoids polymorph wands, potions, and spellbooks as results.

## JS Implementation Notes

- `js/cmd.js:11605-11615`: carried potion source and source-first target menus now expose non-self carried potions against non-self carried non-coin targets, moving toward C's broad `drink_ok()`/`dip_ok()` shape rather than only locally implemented effect pairs.
- `js/cmd.js:11753-11805`: the local polymorph replacement helper generates a same-class object through `mkobj()`, rejects polymorph potion/wand/spellbook results, preserves represented C fields, and mutates the carried inventory object while preserving its inventory letter.
- `js/cmd.js:11807-11842`: the polymorph potion branch implements C's target/source resistance asymmetry, `Nothing happens.` no-consume resistance path, source consumption after non-resistant attempts, `Nothing seems to happen.` same-kind path, changed-kind inventory-line feedback, polymorph discovery, and `polypiles` conduct increment.
- `js/cmd.js:12209-12216`: dispatch keeps water before polymorph and polymorph before acid, oil, poison, and horn/amethyst neutralization.
- `test/shop-billing-helpers.test.mjs:3997-4088`: focused public tests cover broad non-effect menu exposure, source-first unsupported target exposure without fountain prompting, polymorph-potion target replacement/source consumption, and hard-unpolyable wand-of-polymorph no-consume resistance.

## Follow-Ups

- Audit 36 covers the first potion-potion alchemy slice, and Audit 37 adds bounded alchemy-explosion vapor effects. Remaining alchemy work is exact object-registry result metadata, fumbling drop behavior, complete altered-target shop repricing, thrown/broken potion vapor delivery, non-`kn` `trycall()` prompt parity, and water vapor gremlin/lycanthropy transformations.
- Replace local `poly_obj()` approximation with registry-backed object classes and metadata so magic/nonmagic matching, concrete `otyp` comparisons, merge collapse, tool/wand/spellbook degradation, worn-object changes, and container deletion follow C without ad hoc field checks.
- Add the C self-potion/Klein-bottle path once potion-stack and container semantics are ready; the broadened menus currently keep source and target as distinct inventory objects.
- Add real `?*` menu rendering for the broadened source/target prompts instead of only advertising those keys in the prompt text.
- Consolidate neutral-water `#dip` with a shared `water_damage()` primitive and central potion discovery/type-call handling.
- Continue poison lifecycle parity outside dipping; the current branch only covers coating/removal during potion `#dip`.
