# Rolling Boulder Path Teleport Effects

## Scope

Cover the C `launch_obj()` branch where a monster-triggered rolling boulder crosses `TELEP_TRAP` or `LEVEL_TELEP` on its path.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3460` through `:3488` handles rolling boulders on level teleporters and ordinary teleport traps.
- `LEVEL_TELEP` calls `random_teleport_level()` first. If it returns the current depth, C skips the disappearance message, does not call `seetrap()`, and lets the boulder keep rolling.
- Active `LEVEL_TELEP` falls through to the ordinary teleport branch, queues the object for migration with `ox` and `oy` set to the destination dungeon and level, and sets `owornmask` to `MIGR_RANDOM`.
- `TELEP_TRAP` calls `rloco(singleobj)` for object teleportation and ignores fixed monster/hero teleport destinations.
- `nethack-c/upstream/src/teleport.c:2102` through `:2186` covers `rloco()`: extract the object, choose random `goodpos()` coordinates with `rn1(COLNO - 3, 2)` and `rn2(ROWNO)`, apply `flooreffects(obj, tx, ty, "fall")`, and place the object if it survives.

## JS Change

- `js/cmd.js` now exports the existing C-shaped `randomTeleportDepth()` and `levelTeleportNumericTarget()` helpers for non-hero callers.
- `js/allmain.js` now checks rolling-boulder path `TELEP_TRAP` and `LEVEL_TELEP` after landmines and before pit/hole floor effects.
- Ordinary teleport traps move the boulder with an object `rloco()`-style helper that uses C-shaped coordinate rolls, rejects hero and boulder squares, applies `earthFloorEffects(..., 'fall')` at the destination, and suppresses final path placement.
- Active level teleporters queue the boulder in the existing random-arrival object migration map and preserve `MIGR_RANDOM` metadata on the boulder.
- Same-depth level teleporter rolls return to the main rolling loop without messages or trap discovery.

## Tests

- `rolling boulder relocates on visible path teleport trap`
- `rolling boulder level teleporter same-level roll keeps rolling`
- `rolling boulder level teleporter migrates boulder off level`

The tests use local trap, boulder, visibility, migration, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `launch_obj()` parity remains broader trap/terrain work: launch-drop preservation, final-placement floor effects, hero-triggered rolling-boulder rewriting, occupation/multi interruption, and mounted-steed diversion.
