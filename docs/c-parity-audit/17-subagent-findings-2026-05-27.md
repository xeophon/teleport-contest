# Contained Egg Hatch Timer Audit - 2026-05-27

This note records the C-source and JS audits for due egg hatch timers on contained objects. The implemented slice makes contained eggs consume due hatch timers without hatching, matching C `OBJ_CONTAINED` behavior.

## Source Anchors

- `include/timeout.h:37` defines `HATCH_EGG` as an object timer.
- `timeout.c:981` `attach_egg_hatch_timeout()` stops any previous hatch timer and schedules a `TIMER_OBJECT` hatch callback.
- `timeout.c:2231` `run_timers()` removes the due timer and decrements the object's timer count before calling `hatch_egg()`, so early returns still consume the timer.
- `timeout.c:1017` `hatch_egg()` returns immediately for `NON_PM` eggs after the timer has already been consumed.
- `timeout.c:1038` `hatch_egg()` only proceeds when `get_obj_location(egg, &x, &y, 0)` succeeds. With flags `0`, contained and buried objects are excluded.
- `zap.c:642` `get_obj_location()` only follows contained objects when `CONTAINED_TOO` is requested; `hatch_egg()` does not request it.
- `timeout.c:1109` the hatch message/removal switch only handles inventory, floor, and monster inventory.
- `timeout.c:1168` only successfully located and partially hatched stacks receive a short follow-up hatch timer.
- `timeout.c:2559` object timer save locality recurses through containers, so contained timers still exist and fire according to their outer object location.
- `mon.c:5609` genocide cleanup recursively scans container contents and `kill_egg()` only stops hatch timers without changing egg identity or quantity.

## Implemented JS Status

- `processEggHatchTimeouts()` now scans active container contents under hero inventory, floor objects, and monster inventories when collecting due egg timers.
- Due contained eggs are tagged as `source: 'contained'`, have their hatch fields cleared, and then stop before hatch-location, monster creation, quantity decrement, removal, messages, or rescheduling.
- Loose inventory, floor, and monster-inventory eggs keep the existing hatch-candidate paths.
- The scan supports both `contents` and `cobj` child lists and guards against duplicate/cyclic traversal.

## Tests Added

- `contained due egg consumes hatch timer without hatching or leaving container`
- `contained due egg scan recurses through active carried floor and monster containers`

## Remaining Follow-Ups

- C also consumes due hatch timers for buried and migrating eggs because `hatch_egg()` cannot locate them with flags `0`; JS still only processes active inventory/floor/monster/container graphs for due hatching.
- Saved-level timer catch-up remains broader save/restore work: C saves local object timers with their level and runs expired timers on restore with silent hatch semantics.
- The JS timer model is still field-based rather than a central object timer queue, so split/move/merge timer behavior is only modeled in covered paths.

## Follow-Up Status

The proposed shop-billing continuation is now covered in `18-subagent-findings-2026-05-27.md`. Remaining timer follow-ups above are still open.
