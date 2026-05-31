# replace_terrain primitive parity

## Upstream anchors

- `sp_lev.c:lspo_replace_terrain()` parses `toterrain`, `fromterrain`,
  `chance`, `lit`, and either an explicit region or selection before scanning
  inclusive bounds.
- `sp_lev.c:5123` skips column 0, checks each selected square, consumes
  `rn2(100)` only for matching source terrain, supports `MATCH_WALL`, and calls
  `set_levltyp_lit()` for successful replacements.
- `mkmaze.c:set_levltyp_lit()` keeps lava lit regardless of requested light
  state, supports `SET_LIT_RANDOM`, and leaves existing light unchanged when
  `lit` is omitted.
- `dat/minetn-1.lua:68` uses `des.replace_terrain()` for Orcish Town wall
  breakage; other hand-coded specials use the same JS helper for terrain
  substitution.

## JS gap

`replace_special_terrain()` only accepted the old JS width/height signature and
direct type equality. It did not expose source-shaped inclusive region bounds,
`MATCH_WALL`, or the `lit` semantics that future `des.replace_terrain()` support
needs. It also directly assigned terrain without the shared lava-lighting rule.

## Change

- Added a small `setSpecialTerrainLit()` helper matching the relevant
  `set_levltyp_lit()` behavior for level generation.
- Extended `replace_special_terrain()` to accept a C-shaped region object with
  `x1/y1/x2/y2`, `fromTyp`, `toTyp`, `chance`, and `lit`.
- Preserved the existing width/height signature used by current special-level
  builders.
- Added `MATCH_WALL` source matching and successful-replacement counts for
  focused tests and future special-level interpreters.

## Tests

Focused tests cover:

- inclusive region replacement with `MATCH_WALL` and explicit lit updates;
- old width/height signature compatibility;
- lava replacements forcing lit terrain even when `lit=0`.

These tests use synthetic maps and C-shaped semantics rather than replay maps or
public seed assertions.

