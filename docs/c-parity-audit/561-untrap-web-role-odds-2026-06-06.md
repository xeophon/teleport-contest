# Web `#untrap` Role Odds

## Scope

Port the Rogue and Ranger role modifiers in C's `untrap_prob()` for web `#untrap`. This covers Ranger's chance decrement, Rogue's level-check RNG draw, Rogue quest-artifact chance decrement, and the final clamp before the existing success roll.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:5289` through `:5335` computes `untrap_prob()`.
- `nethack-c/upstream/src/trap.c:5327` through `:5333` applies Rogue and Ranger role modifiers after confusion/blind/stun/fumbling/made-by-user adjustments.
- `nethack-c/upstream/include/global.h:413` defines `MAXULEV` as `30`, so Rogue's level check is `rn2(60) < u.ulevel`.

## JS Change

- `js/cmd.js` imports `MAXULEV`.
- `untrapWebChance()` now applies C role modifiers after the existing web/status/own-web modifiers:
  - Rogue consumes `rn2(2 * MAXULEV)` and decrements chance when the roll is below hero level.
  - Rogue with the quest artifact decrements chance again when chance is still above `1`.
  - Ranger decrements chance when chance is above `1`.
  - Chance is clamped to at least `1` before the final existing `rn2(chance)` roll.

## Tests

- `#untrap Ranger web odds get C role bonus`
- `#untrap Rogue web odds consume level check before final roll`
- `#untrap Rogue quest artifact further improves web odds`

These tests drive the real extended command input, assert exact RNG call order, final chance values, web removal, message text, and turn consumption.

## Remaining Work

- Current-square web plus container prompt parity remains open, including `q` no-time cancellation and `n` trap-skip behavior.
- Current-square container-only `#untrap` still does not route to C's box/chest untrap path.
- Exact reach-floor and tight diagonal web-untrap gates remain open.
- Boulder handling still needs the C `Passes_walls` exception.
