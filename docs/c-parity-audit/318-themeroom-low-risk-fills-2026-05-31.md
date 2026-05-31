# themed-room low-risk fill parity

## C references

- `dat/themerms.lua` defines the simple room fills for `Boulder room`, `Trap
  room`, `Statuary`, and `Light source`.
- `selvar.c:selection_from_mkroom()` builds `selection.room()` from the current
  `mkroom`, excluding edge cells and cells with a different `roomno`.
- `selvar.c:selection_iterate()`, `selection_filter_mapchar()`, and
  `selection_rndcoord()` use x-major scans over the selection bounds.
- `dat/nhlib.lua:shuffle()` uses a descending Fisher-Yates shuffle, where each
  step consumes `math.random(i)` and therefore one `rn2(i)`.

## Previous JS behavior

The JS themed-room path already had a few bespoke fills, but these low-risk Lua
fills were still absent. The reusable selection producer also lacked
`selection.room()`, `filter_mapchar()`, and `rndcoord()`, which blocked direct
translation of several `themerms.lua` snippets.

## Implementation notes

- Added `SplevSelection.room(croom)`, `filterMapchar()`/`filter_mapchar()`, and
  `rndcoord(remove)` with C-shaped bounds scans and RNG consumption.
- Aligned `SplevSelection.iterate()` to C's x-major order.
- Reused the C-shaped Lua shuffle for themed-room trap selection.
- Ported the simple fills:
  - `Boulder room`: `selection.room():percentage(30)`, then per-point boulder
    versus rolling-boulder trap.
  - `Trap room`: shuffled trap table, then one selected trap type over
    `selection.room():percentage(30)`.
  - `Statuary`: `d(5,5)` random statues and `d(3)` statue traps.
  - `Light source`: one lit oil lamp in the room.

## Tests

- `special-level room selection filters mapchars and random coordinates like C`
- `themed Boulder and Trap rooms use C room selections`
- `themed Statuary and Light source fills create C-shaped contents`

## Remaining gaps

The larger themed-room families still need their own slices, especially
Cloud/Garden/Ice terrain mutation, monster-heavy room fills, postprocessing, and
the full special-level Lua hook lifecycle.
