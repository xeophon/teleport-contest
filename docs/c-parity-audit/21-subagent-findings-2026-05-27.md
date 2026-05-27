# C Parity Audit 21: Squeaky Board Grease Usage Billing

## Scope

This slice covers successful `#untrap` repair of a seen `SQKY_BOARD` with a carried can of grease, including the C `check_unpaid_usage()` billing order for an unpaid charged can. It does not claim generic `#untrap` parity, potion-of-oil selection, non-squeaky traps, or full failure side effects.

## C Source Notes

- `nethack-c/upstream/src/trap.c:5605-5625`: `unsqueak_ok()` suggests any `CAN_OF_GREASE`, suggests known oil, downplays other potions, and excludes other objects.
- `nethack-c/upstream/src/trap.c:5630-5659`: `disarm_squeaky_board()` prompts with `getobj("untrap with", ...)`; cursed grease or zero-charge grease is a bad tool, otherwise normal `try_disarm()` odds apply. On success it calls `consume_obj_charge(obj, TRUE)`, prints `You repair the squeaky board.`, deletes the trap, redraws the target, and returns a spent turn.
- `nethack-c/upstream/src/trap.c:5891-5972`: `#untrap` ignores unseen traps and dispatches `SQKY_BOARD` to `disarm_squeaky_board()`.
- `nethack-c/upstream/src/invent.c:1335-1344`: `consume_obj_charge()` calls `check_unpaid()` before decrementing `spe`.
- `nethack-c/upstream/src/shk.c:5688-5742`: `check_unpaid_usage()` only bills live unpaid shop rows, uses the charged-item cost-per-charge rules, and emits the generic `Usage fee` shopkeeper message for can-of-grease usage.

## JS Status

- `js/cmd.js` now routes seen squeaky-board `#untrap` targets into a small `untrap with` inventory prompt for cans of grease instead of leaving the direction handler as a pure stub.
- Successful charged can-of-grease repair uses the existing `spendChargedToolUse()` helper, so a live unpaid bill row adds the normal can-of-grease usage debit before the charge is decremented and before `You repair the squeaky board.`.
- The repaired trap is removed from `game.level.traps` and the target square is redrawn.
- Stale field-only unpaid grease still spends one charge on successful repair but does not synthesize shop debt without a current bill row.

## Remaining Follow-Ups

- Potion of oil and downplayed potion selection from C `unsqueak_ok()`.
- Full `try_disarm()` side effects, including `Whoops...` movement/trigger behavior.
- Generic `#untrap` trap handling beyond the squeaky-board can-of-grease path.
- Broader command/menu centralization for `getobj()` prompts.
