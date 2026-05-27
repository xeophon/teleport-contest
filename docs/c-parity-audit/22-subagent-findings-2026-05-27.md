# C Parity Audit 22: Squeaky Board Potion-of-Oil Untrap

## Scope

This follow-up extends the squeaky-board `#untrap` slice from can-of-grease repair to potion selection, especially successful repair with potion of oil. It still does not claim generic `#untrap`, exact `getobj()` menu downplay rendering, or full `try_disarm()` failure side effects.

## C Source Notes

- `nethack-c/upstream/src/trap.c:5605-5625`: `unsqueak_ok()` suggests can of grease, suggests known/dknown potion of oil, downplays other potions including unidentified oil, and excludes non-potion non-grease objects.
- `nethack-c/upstream/src/trap.c:5630-5659`: `disarm_squeaky_board()` treats cursed oil, lit oil, non-oil potions, cursed grease, and empty grease as bad tools. On successful grease repair it calls `consume_obj_charge(obj, TRUE)`. On successful oil repair it calls `useup(obj)` then `makeknown(POT_OIL)`.
- `nethack-c/upstream/src/invent.c:1319-1333`: `useup()` consumes one quantity from a stack or deletes the final inventory object through `useupall()`.
- `nethack-c/upstream/src/shk.c:1187-1229`: `obfree()` preserves an unpaid final consumed object as a used-up shop bill row.
- `nethack-c/upstream/src/shk.c:1568-1584`: partial unpaid stack billing compares the original bill quantity with the surviving object quantity.

## JS Status

- `js/cmd.js` now splits squeaky-board candidates from prompt suggestions: grease and known oil are suggested, while other potions remain selectable from the `[*]` path and fail as bad tools.
- Successful potion-of-oil repair consumes one carried potion, identifies oil, repairs and removes the trap, redraws the square, and spends the command turn.
- Unpaid oil repair preserves C's billing distinction: it does not call `checkUnpaidUsage()` or emit the Yendorian Fuel Tax message; a final consumed unpaid potion becomes a used-up bill row, while stale field-only unpaid state does not create debt.
- Lit oil and non-oil potions fail without consuming the potion or mutating the shop bill.

## Remaining Follow-Ups

- Exact inventory-menu downplay presentation for unidentified oil and other potions.
- Full `try_disarm()` failure behavior, including `Whoops...`, movement onto the trap, and trap triggering.
- Generic `#untrap` handling for other trap classes.
