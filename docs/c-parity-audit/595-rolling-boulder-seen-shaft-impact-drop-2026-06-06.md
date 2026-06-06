# Rolling Boulder Seen Shaft Impact Drop

## Scope

Cover the C `ship_object()` boulder exception when a monster-triggered rolling boulder reaches a seen hole or trap door that is also a down-gate route.

This slice does not use replay maps, hidden tests, fixed seeds, player names, move counts, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3423` calls `down_gate()` and `ship_object(singleobj, x, y, FALSE)` before the rolling path trap switch.
- `nethack-c/upstream/src/dokick.c:1657` computes the non-ladder `rn2(3)` no-drop roll inside `ship_object()`.
- `nethack-c/upstream/src/dokick.c:1665` through `:1679` counts other objects on the square, then applies the boulder/hole exception: boulders do not fall through holes or trap doors, but can call `impact_drop(otmp, x, y, 0)` before returning `FALSE`.
- `nethack-c/upstream/src/dokick.c:1511` through `:1619` migrates impacted floor objects and uses missile-impact wording such as `From the impact, the other object falls.`.
- `nethack-c/upstream/src/trap.c:3489` through `:3506` then handles the same `HOLE` or `TRAPDOOR` through `flooreffects(singleobj, x2, y2, "fall")`, stopping the rolling boulder and plugging the shaft.

## JS Change

- `js/allmain.js` now allows seen hole/trapdoor down gates to enter the rolling-boulder down-gate helper.
- For `MIGR_RANDOM` trap gates and a rolling boulder, JS now consumes the C-shaped non-ladder `rn2(3)` roll, skips transit text, impact-drops same-square floor piles with missile-impact wording, and returns unhandled so the existing pit/hole `earthFloorEffects()` plug path runs.
- The rolling boulder itself is not queued for migration through the seen hole/trapdoor path.

## Tests

- `rolling boulder impact-drops seen path hole pile before plugging`
- `rolling boulder seen path trap door consumes ship-object roll before plugging`
- `rolling boulder unseen path trap door buries pile without shaft impact drop`

The tests use local trap, terrain, visibility, object, migration, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Broader `launch_obj()` parity still includes launch-drop preservation, hero-triggered rolling-boulder rewriting, occupation/multi interruption, mounted-steed diversion, and final placement side effects.
- Shared impact-drop and boulder liquid details outside this slice still need source-backed coverage, including adjacent-lava damage modifiers and non-visual wake/noise details.
