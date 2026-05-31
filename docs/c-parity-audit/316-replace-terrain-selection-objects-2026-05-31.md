# replace_terrain selection object parity

## Upstream anchors

- `sp_lev.c:lspo_replace_terrain()` reads an explicit `selection` table entry
  with `l_selection_check()`, then uses `selection_getbounds()` and
  `selection_getpoint(x, y, sel)` while scanning the bounded rectangle.
- `nhlsel.c:l_selection_getpoint()` exposes the Lua-side `sel:get(x, y)`
  selection predicate.
- `nhlsel.c:l_selection_getbounds()` exposes the Lua-side `sel:bounds()` result
  with `lx`, `ly`, `hx`, and `hy`.
- Invalid explicit selections do not fall back to a whole-map selection; the C
  loader raises a Lua error instead.

## JS gap

The descriptor helper accepted arrays, `Set`s, and `{ points }` collections, but
it did not accept object-shaped selection predicates. Future direct translations
of special-level Lua selection values would need to flatten selections to points
before calling `replaceDesTerrain()`, which differs from the C `bounds()` plus
`get(x, y)` path and can hide invalid descriptor shapes.

## Change

- Added object-selection bounds parsing from `bounds()`, `bounds`, or direct
  `lx`/`ly`/`hx`/`hy` fields, with numeric validation.
- Added C-style predicate support for `selection.get(x, y)` and
  `selection.has(x, y)`, while preserving string-key `has("x,y")` and
  `has("x:y")` masks.
- Added `selection.iterate(callback)` support for precomputed masks that expose
  the Lua-style iterator API rather than a predicate API.
- Explicit unrecognized selection objects now raise a `TypeError` rather than
  being treated as an absent selection.

## Tests

Focused tests cover:

- `bounds()` plus `get(x, y)` scanning only the bounded rectangle;
- direct bounds fields plus `has(x, y)`;
- C-shaped empty predicate selections;
- iterator selections, including the C `replace_terrain` scan's column-zero
  skip;
- invalid explicit selection objects refusing to scan the whole map.

These tests use synthetic map state and descriptor-shaped helper calls, not
public replay state or seed-specific output.
