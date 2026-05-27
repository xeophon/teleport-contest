# C Parity Audit: Buried and Migrating Egg Due Timers

## Scope

Audited NetHack C due hatch timers for eggs that are buried, still migrating, or carried by migrating monsters. This extends the contained due-egg behavior from `17-subagent-findings-2026-05-27.md`: the timer fires and is consumed, but the egg cannot hatch because C cannot locate it as an active inventory, floor, or local monster-inventory object.

## C Behavior

- `include/timeout.h:37` defines `HATCH_EGG` as an object timer.
- `src/timeout.c:981-1004` attaches hatch timers as `TIMER_OBJECT` callbacks and `src/timeout.c:1009-1013` stops them without changing egg species.
- `src/timeout.c:2222-2240` removes a due timer and decrements the object's timer count before calling the callback, so every early return still consumes the timer.
- `src/timeout.c:1017-1041` `hatch_egg()` only proceeds when `get_obj_location(egg, &x, &y, 0)` succeeds.
- `src/zap.c:642-688` `get_obj_location()` rejects migrating objects, buried objects without `BURIED_TOO`, contained objects without `CONTAINED_TOO`, and monster inventory carried by migrating monsters.
- `src/timeout.c:1109-1162` only has successful hatch handling for `OBJ_INVENT`, `OBJ_FLOOR`, and `OBJ_MINVENT`.
- `src/timeout.c:2560-2572` treats buried object timers as local, migrating object timers as global, contained timers according to their outer container, and monster-inventory timers according to monster locality.
- `src/mon.c:5608-5676` genocide cleanup already scans inventory, floor, buried, migrating, and monster-inventory egg graphs and only kills timers.

## Porting Decision

Keep the existing field-based timer model for this bounded slice, but expand due hatch scanning to cover the C-inert locations:

- Due eggs in `level.buriedobjlist` have hatch fields cleared without quantity changes, unburying, messages, monster creation, or rescheduling.
- Due eggs in migration queues (`_impact_drop_migrations`, `migrating_objs`, `_migrating_objs`) behave the same way.
- Due eggs carried in `migrating_mons` / `_migrating_mons` inventory also consume their timers without hatching.
- Contained eggs under those buried or migrating roots inherit the same inert behavior.
- Future timers in the same roots are left untouched.

## JS Status

- `js/allmain.js` now collects inert due eggs from buried object lists and modeled migration queues in `dueEggEntries()`.
- `processEggHatchTimeouts()` now treats `source: 'buried'` and `source: 'migrating'` like `source: 'contained'`: clear the due hatch timer and stop before hatch-location, `makemon()`, quantity mutation, removal, message, or short remainder reschedule.
- Active inventory, floor, and local monster-inventory eggs keep their existing hatch-candidate behavior.

## Regression Coverage

Added focused tests in `test/egg-timers.test.mjs`:

- `buried due egg consumes hatch timer without hatching or unburying`
- `migrating due egg consumes hatch timer without hatching or dequeuing`

Existing contained due-egg and genocide cleanup tests remain green.

## Remaining Follow-Ups

- Saved-level egg timer catch-up remains open: C runs stale local timers on restore with silent hatch semantics.
- Split/move timer identity remains local-field based rather than C's central `obj_split_timers()` / `obj_move_timers()` queue.
- A central object timer registry is still needed for broader parity across eggs, corpses, globs, figurines, burn timers, buried organics, and ice timers.
