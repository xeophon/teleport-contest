# Hero Rolling Boulder Final Cleanup

Date: 2026-06-06

## Scope

Cover the final-placement cleanup that C `launch_obj()` applies after a hero-triggered rolling-boulder trap releases a boulder.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` captures the rolling-boulder trap's prior known state in `style`.
- `nethack-c/upstream/src/trap.c:2669` calls `launch_obj(BOULDER, launch, launch2, style)` for hero-triggered rolling-boulder traps.
- `nethack-c/upstream/src/trap.c:3281` through `:3289` extract the selected boulder from the floor list before launch.
- `nethack-c/upstream/src/trap.c:3317` through `:3320` set `singleobj->otrapped = 1` only for the known hero-triggered style before entering the rolling path.
- `nethack-c/upstream/src/trap.c:3566` through `:3571` clear `singleobj->otrapped`, call `place_object(singleobj, x2, y2)`, and redraw the final square when the boulder survives.
- `nethack-c/upstream/src/mkobj.c:2356` through `:2359` clear stale `no_charge` unless final placement is still a costly spot or costly adjacent square.

## JS Coverage

- `js/cmd.js` now routes the simplified hero-triggered released-boulder endpoint placement through a local final-rest helper.
- Released hero-triggered boulders clear stale `otrapped`, `hidden`, and transient projectile state before being reinserted on the floor.
- Stale `no_charge` is cleared for non-shop final rests using the existing command-side shop room helpers, including shared-room boundary scans already present in `cmd.js`.
- Known-trap releases still mark the boulder as `otrapped` before final cleanup, preserving the C style flag shape for later richer launch-path reuse.

## Tests

- `hero rolling boulder final rest clears stale launch metadata and no-charge`

## Remaining Edges

- The hero-triggered branch still uses a simplified endpoint placement rather than the full rolling path in `launch_obj()`.
- Hero-triggered mounted-steed diversion, path terrain effects, rock-thrower snatch, boulder chaining, and wall/tree/bar stops should eventually share the richer monster rolling-boulder path.
- Generic object timer checks from `place_object()` remain broader floor-placement work and are not modeled by this command-local helper.
