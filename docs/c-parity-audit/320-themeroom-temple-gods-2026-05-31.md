# themed-room Temple of the gods parity

## C references

- `dat/nhlib.lua` initializes `align = { "law", "neutral", "chaos" }` and
  shuffles it once when the Lua helper library is loaded.
- `dat/themerms.lua` uses that shuffled table in `Temple of the gods`, placing
  three altars with `align[1]`, `align[2]`, and `align[3]`.
- `sp_lev.c:lspo_altar()` defaults the altar `type` to plain `"altar"`.
- `sp_lev.c:create_altar()` sets `altarmask` from the requested alignment and
  only creates a shrine/priest when the requested type is shrine/sanctum and the
  containing room is a temple.

## Previous JS behavior

Regular level generation already consumed the Lua `align` shuffle RNG when
loading themed rooms for a branch, but it discarded the shuffled result.
`Temple of the gods` was listed in the themed fill metadata and had no fill
dispatch.

## Implementation notes

- Store the per-branch shuffled themed-room alignment table without changing the
  existing RNG consumption.
- Added the `Temple of the gods` themed fill.
- The fill places three plain altars in the current themed room using
  a local `get_free_room_loc()`-style helper: start from a random `somexy()`
  dry room coordinate and retry until the resulting terrain is `ROOM`.
- The altar placement sets both `altarmask` and the JS display-side `flags`,
  and does not mark shrine/sanctum bits.

## Tests

- `themed Temple of the gods places three plain shuffled-alignment altars`

## Remaining gaps

This covers only the fill contents. Full special-level Lua altar support still
needs generic descriptor parsing, explicit coordinates, and shrine/sanctum
priest creation.
