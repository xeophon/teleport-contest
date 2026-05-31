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

## Previous JS behavior

Storeroom handling existed inline in `apply_themeroom_fill()`, but it did not
use the shared selection helper.

## Implementation notes

- Extracted the fill into `themeroom_storeroom()`.
- The fill now uses `selection.room().percentage(30).iterate()` for the C
  selected-point count and ordering.
- Preserved the existing pre-`mkclass` `rn2(3)` compatibility burn for mimic
  setup. Removing it regresses public replay RNG; this should be revisited with
  a fuller `des.monster({ class = "m", appear_as = ... })` and mimic-init audit.

## Tests

- `themed Storeroom creates only chests and chest mimics`
