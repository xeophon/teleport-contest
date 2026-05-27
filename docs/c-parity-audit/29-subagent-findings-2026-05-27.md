# C Parity Audit 29: Potion-of-Acid Corrosion Through #dip

## Scope

This slice adds the bounded carried-object acid `#dip` branch. It covers corrosion of corrodeable inventory targets, grease protection before material checks with acid consumption, no-consume proofed/maxed no-effect cases, and unpaid acid potion use-up billing through the existing inventory consumption path. It intentionally does not implement alchemy, unicorn horn/amethyst mixtures, source-first `#altdip`, or the full C source menu.

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
- `js/cmd.js:11582-11694` now handles acid corrosion: greased targets consume acid without corrosion, proofed or already thoroughly corroded targets report no-effect without consuming acid, successful corrosion increments `oeroded2`, and unpaid acid stacks are consumed through `useUpInventoryItem()` without `checkUnpaidUsage()`.
- `test/shop-billing-helpers.test.mjs:3491-3632` covers acid corrosion, max-corrosion no-consume behavior, grease protection including the grease-before-material branch, corrodeproof no-consume behavior, and unpaid acid stack residual billing without usage debit.

## Remaining Follow-Ups

- Source-first `#altdip` remains separate. C selects the source potion first through `potion.c:2374` and inventory item actions queue `dip_into` through `iactions.c:159/371`; JS inventory actions still need an `a` action for non-oil potions and should skip floor-water prompts.
- Poisoned weapon display ordering remains separate. C `xname()` and `doname()` differ, so inventory and `#dip` prompts should eventually show `poisoned +0 dart` while coating messages keep `poisoned dart`.
- Full potion matrix work remains: alchemy, unicorn horn/amethyst mixtures, water/Bless/curse paths beyond covered local cases, and source menus for unsupported potion/target pairs.
- Acid corrosion currently uses the existing JS damage-profile heuristic rather than a central C object-material registry; broad material parity still belongs with the object registry work.
