# themed-room Storeroom parity

## C references

- `dat/themerms.lua` defines `Storeroom` with
  `selection.room():percentage(30)`.
- For each selected point, Lua rolls `percent(25)`. Success creates a random
  room-position chest; failure creates an `m`-class monster with
  `appear_as = "obj:chest"`.
- The selected points control the number of contents; the chest or mimic
  placement itself is random within the room because no explicit coordinate is
  passed to `des.object()` or `des.monster()`.
- `des.monster()` defaults a missing `align` field to `random`
  (`src/sp_lev.c:get_table_align()`), and `create_monster()` resolves that
  random alignment before `mkclass()`. On unaligned Dungeons of Doom themed
  rooms, `induced_align(80)` falls through to `rn2(3) - 1`
  (`src/dungeon.c`).

## Previous JS behavior

Storeroom handling existed inline in `apply_themeroom_fill()`, but it did not
use the shared selection helper.

## Implementation notes

- Extracted the fill into `themeroom_storeroom()`.
- The fill now uses `selection.room().percentage(30).iterate()` for the C
  selected-point count and ordering.
- Preserved the pre-`mkclass` `rn2(3)` as the source-backed default
  special-level random-alignment roll for `des.monster({ class = "m",
  appear_as = ... })`, rather than a replay-only compatibility burn.

## Tests

- `themed Storeroom creates only chests and chest mimics`
