# themed-room Buried treasure parity

## C references

- `dat/themerms.lua` defines `Buried treasure` as a buried chest with a
  `contents` callback.
- `src/sp_lev.c:create_object()` deletes the random box contents when a
  special-level `contents` callback is present, then routes nested
  `des.object()` calls into that container.
- The Lua callback inserts `d(3,4)` random objects and records the buried
  chest coordinates for `make_dig_engraving`.
- `make_dig_engraving` runs during `post_level_generate()`, chooses a room
  floor, and creates a burned "Dig ..." engraving pointing at the chest.

## Previous JS behavior

`Buried treasure` was present in `THEMEROOM_FILL_META`, but it had no dispatch
case in `apply_themeroom_fill()`.

## Implementation notes

- Added `themeroom_buried_treasure()` to create a chest at a random room
  location, delete default chest contents, insert `d(3,4)` random contained
  objects, and move the chest into `level.buriedobjlist`.
- Added a `digEngraving` themed-room postprocess entry so the burned hint is
  created after fill generation, matching the Lua postprocess shape.
- Direction text is computed from JS absolute coordinates, so the Lua local
  coordinate x-offset is not applied here.

## Tests

- `themed Buried treasure creates a buried loot chest and dig engraving`
