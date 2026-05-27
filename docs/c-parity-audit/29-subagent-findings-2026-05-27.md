# C Parity Audit 29: Potion-of-Acid Corrosion Through #dip

## Scope

This slice adds the bounded carried-object acid `#dip` branch. It covers corrosion of corrodeable inventory targets, grease protection before material checks with acid consumption, no-consume proofed/maxed no-effect cases, and unpaid acid potion use-up billing through the existing inventory consumption path. It intentionally does not implement alchemy, unicorn horn/amethyst mixtures, or the full C source menu. Source-first `#altdip` for implemented effects is covered in audit 30.

## C Source Notes

- `nethack-c/upstream/src/potion.c:2267-2376`: normal `#dip` selects the target first, offers floor water features, then asks for a potion source.
- `nethack-c/upstream/src/potion.c:2442-2455`: `potion_dip()` receives the selected object and potion.
- `nethack-c/upstream/src/potion.c:2638-2641`: potion of acid calls `erode_obj(obj, 0, ERODE_CORRODE, EF_GREASE)` and consumes the potion only when the erosion result is not `ER_NOTHING`.
- `nethack-c/upstream/src/potion.c:2408-2412`: successful acid use reaches `poof()`, which runs `trycall()` when `dknown` and then `useup(potion)`.
- `nethack-c/upstream/src/trap.c:170-310`: `erode_obj()` applies secondary corrosion, respects grease, proofing, blessed saves, max erosion, and `MAX_ERODE`, and only charges costly alteration when `EF_PAY` is set.
- `nethack-c/upstream/src/trap.c:360-382`: `grease_protect()` can consume the grease layer; acid still consumes the potion because `ER_GREASED` is not `ER_NOTHING`.

## JS Status

- `js/cmd.js:10480-10484` now identifies potion of acid as a potion source.
- `js/cmd.js:11512-11530` now offers acid for carried corrodeable targets or greased non-potion targets alongside the existing oil/sickness/healing source selection.
- `js/cmd.js:11607-11719` now handles acid corrosion: greased targets consume acid without corrosion, proofed or already thoroughly corroded targets report no-effect without consuming acid, successful corrosion increments `oeroded2`, and unpaid acid stacks are consumed through `useUpInventoryItem()` without `checkUnpaidUsage()`.
- `test/shop-billing-helpers.test.mjs:3491-3632` covers acid corrosion, max-corrosion no-consume behavior, grease protection including the grease-before-material branch, corrodeproof no-consume behavior, and unpaid acid stack residual billing without usage debit.

## Remaining Follow-Ups

- Source-first `#altdip` is now covered in audit 30 for implemented potion effects and the known-oil apply exception; broad non-self carried potion source/target menus are covered in audit 35.
- Poisoned weapon display ordering was handled in audit 31 for inventory and `#dip` prompts, while coating/removal messages still keep `xname()` wording.
- Remaining potion matrix work is potion-potion alchemy, full `poly_obj()` fidelity, shared water-damage/discovery primitives, real `?*` menu rendering, and poison lifecycle outside dipping; horn/amethyst, water, broad menus, unsupported no-effect pairs, and bounded polymorph dipping are covered in audits 32-35.
- Acid corrosion currently uses the existing JS damage-profile heuristic rather than a central C object-material registry; broad material parity still belongs with the object registry work.
