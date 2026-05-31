# replace_terrain descriptor parity

## Upstream anchors

- `nhlua.c:check_mapchr()` and its `char2typ` table define the special-level
  descriptor mapchars used by `des.replace_terrain()`.
- `sp_lev.c:lspo_replace_terrain()` accepts `fromterrain`/`toterrain`,
  explicit bounds, `region`, `selection`, or a `mapfragment`, then scans x outer
  and y inner while skipping column 0.
- `sp_lev.c:mapfrag_match()` treats `x` as transparent terrain, `w` as
  `MATCH_WALL`, and out-of-bounds neighbors as `STONE`.
- `mkmaze.c:set_levltyp_lit()` refuses invalid replacement terrain and preserves
  light unless `lit` is supplied, with lava remaining lit.

## JS gap

The shared JS helper accepted numeric terrain types and inclusive bounds, but it
still did not understand C mapchar strings, `fromterrain`/`toterrain` property
names, simple selection masks, or centered mapfragment matching. That left future
special-level translations needing ad hoc string and terrain handling.

## Change

- Added a C-shaped descriptor mapchar parser for `replace_terrain` inputs,
  including `#`, `+`, `A`, `S`, `H`, `\`, `K`, `x`, and `w`.
- Added `replaceDesTerrain()` as a descriptor-shaped helper while keeping
  `replace_special_terrain()` as the existing compatibility wrapper.
- Added centered mapfragment support with odd-size and matchable-center
  validation, live-map matching, `x` transparency, `w` wall matching, and
  out-of-bounds-as-stone behavior.
- Added simple JS selection masks for tests and future generated descriptors.
- Aligned terrain writes with C's stair/ladder overwrite guard unless the debug
  overwrite flag is set.

## Tests

Focused tests cover:

- C mapchar aliases with a simple selection mask;
- mapfragment `w` and `x` matching;
- mapfragment size and center validation;
- chance RNG consumed only after selected terrain matches;
- random-lit RNG consumed only for changed non-lava cells.

The tests use synthetic maps and structural assertions rather than replay maps
or seed-specific output.
