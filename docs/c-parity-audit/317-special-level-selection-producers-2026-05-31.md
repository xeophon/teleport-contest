# special-level selection producer parity

## Upstream anchors

- `nhlsel.c:l_selection_fillrect()` backs `selection.area()` and fills an
  inclusive rectangle into a selection mask.
- `nhlsel.c:l_selection_match()` builds a selection by scanning the live map
  against a C `mapfragment`; the scan skips column zero.
- `selvar.c:selection_filter_percent()` scans x outer, y inner and rolls
  `rn2(100)` only for points already in the source selection.
- `selvar.c:selection_do_grow()` clones the original selection, computes growth
  from the pre-growth mask, and supports all-direction growth including
  diagonal cells implied by adjacent orthogonal direction bits.
- Upstream Lua uses these producers for `replace_terrain` in bigroom and
  themed-room paths, including `selection.match("."):percentage(2):grow()` and
  `selection.area(...):grow()`.

## JS gap

The JS `replaceDesTerrain()` helper could consume arrays, sets, predicates, and
object-shaped selection masks, but there was no reusable producer API for the
C/Lua selection masks themselves. Translating special-level Lua still required
manual point construction, which can easily drift from C scan order and RNG
order.

## Change

- Added a `SplevSelection` mask implementation with C-shaped `get`, `set`,
  `bounds`, `iterate`, `numpoints`, `percentage`, `grow`, and set operations.
- Added `splevSelection.area()` and `splevSelection.match()` helpers for
  descriptor-level special-level translation.
- Preserved C's `percentage()` RNG contract: x-major scanning and one
  `rn2(100)` only for points present in the source mask.
- Preserved C's all-direction growth shape and column-zero replacement behavior
  when produced masks are passed into `replaceDesTerrain()`.
- Tightened descriptor validation so explicit falsy selections and malformed
  explicit bounds/regions raise instead of silently falling through to whole-map
  replacement.

## Tests

Focused tests cover:

- `area(...).grow()` feeding `replaceDesTerrain()` and leaving column zero
  unchanged during replacement;
- `match(".").percentage(100)` consuming the expected selected-point RNG count;
- unioning a produced selection before replacement.
- default whole-map replacement still skipping column zero;
- region-vs-selection precedence;
- falsy explicit selections and malformed bounds/regions refusing replacement.

The tests use synthetic live map state and structural assertions only; they do
not assert replay maps, public seed output, or fixed generated level layouts.
