# special-level and fumble canaries

## Upstream anchors

- `sp_lev.c:lspo_replace_terrain()` only falls back to a whole-map selection
  when no explicit bounds, `region`, or `selection` is supplied. An explicit
  empty selection remains empty and therefore changes no terrain.
- `dat/minetn-3.lua` builds Alley Town as a room/corridor special level with a
  fixed lit outer room, sixteen subrooms, fountains, shrine, shops, and one up
  and one down stair; it is not a `des.level_init({ style = "mines" })` cavern.
- `allmain.c` finishes monster movement before the turn tail, and
  `timeout.c:FUMBLING` rerolls the fumble timeout from that tail. A visible
  monster-turn `--More--` must keep the deferred tail from rerolling early.

## JS gap

- `replaceDesTerrain({ selection: [] })` treated the empty selection as missing
  and scanned the whole map.
- Minetown-3 and deferred fumble-tail ordering had no focused no-replay canary,
  so future refactors could accidentally turn Alley Town into mines-map
  generation or reroll fumble timeout before the visible prompt is dismissed.

## Change

- Explicit empty terrain selections now stay empty.
- `make_minetn3_level()` is exposed through test hooks for structural testing.
- Added a Minetown-3 structural test for special-level flags, outer room,
  sixteen subrooms, mandatory shop/shrine structure, fountains, and stair count.
- Added a fumble deferred-tail test that asserts the timeout remains zero while
  a visible `--More--` is active and rerolls only after the deferred tail resumes.

## Tests

These tests use synthetic state and structural invariants. They do not assert
public replay maps, exact corridor shapes, exact monster/shop RNG, or
seed-specific output.
