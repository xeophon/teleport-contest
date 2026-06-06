# Current-Square `#untrap` Web And Containers

## Scope

Port C target selection for `#untrap .` when the hero's current square contains a seen web and/or box/chest. This covers the web-plus-container choice prompt, `q` no-turn cancellation, `n` web-skip routing into box/chest prompts, current-square box-only routing, and exclusion of ice boxes from `Is_box()` handling.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:5248` through `:5253` makes `dountrap()` consume time only when `untrap()` returns nonzero.
- `nethack-c/upstream/src/trap.c:5891` through `:5899` filters unseen traps and counts boxes only when the target square is the hero's square.
- `nethack-c/upstream/src/trap.c:5925` through `:5950` prompts before handling a web when one or more boxes/chests are also present.
- `nethack-c/upstream/src/trap.c:5995` through `:6024` prompts for one current-square box/chest per move and makes `q`/all-`n` no-time unless later door handling applies.
- `nethack-c/upstream/src/trap.c:6045` through `:6048` prints `You know of no traps there.` for visible no-target fallthrough.
- `nethack-c/upstream/include/obj.h:337` through `:338` defines `Is_box()` as only `LARGE_BOX` or `CHEST`, excluding ice boxes and bags.

## JS Change

- `js/cmd.js` now counts current-square box/chest objects for `#untrap .` using the existing large-box/chest predicate.
- Seen current-square web plus box/chest now asks `There is/are container(s) and a web here.  Remove the web? [ynq] (q)`.
- `y` reuses the existing web removal path; `q`, Escape, space, and Enter cancel without consuming a turn; `n` skips the web and prompts for a box/chest.
- Current-square box-only `#untrap .` now prompts to check a box/chest for traps and consumes a turn only after accepting a check.
- Ice boxes do not trigger the container/web prompt, matching C `Is_box()`.
- Visible no-target `#untrap` fallthrough now uses C's `You know of no traps there.` wording.

## Tests

- `#untrap current-square web and box prompts before removing web`
- `#untrap current-square web and box q cancels without time`
- `#untrap current-square web and box y removes web this move`
- `#untrap current-square web and box n skips web and reaches box prompt`
- `#untrap current-square box only checks box for traps`
- `#untrap current-square web ignores ice boxes for web container prompt`

These tests drive the real extended command input, assert exact prompt text, RNG call order, trap persistence/deletion, box prompt routing, `Is_box()` exclusion for ice boxes, and turn consumption.

## Remaining Work

- Box/chest trap side effects are still partial: the failed-disarm one-shot trap state is covered in `565-untrap-box-one-shot-failure-2026-06-06.md`, but full C `chest_trap()` effects are not fully modeled.
- Box/chest trap detection observation state is covered separately in `566-untrap-box-observation-2026-06-06.md`.
- The adjacent-boulder `Passes_walls` exception is covered separately in `563-untrap-web-boulder-passwalls-2026-06-06.md`.
- Reach-floor and tight-diagonal web-untrap gates are covered separately in `564-untrap-web-reach-diagonal-2026-06-06.md`.
