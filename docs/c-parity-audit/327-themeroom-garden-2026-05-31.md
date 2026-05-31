# themed-room Garden parity

## C references

- `dat/themerms.lua` defines `Garden` as eligible only for lit themed fills.
- The fill uses `selection.room()` and creates `selection:numpoints() / 6`
  sleeping wood nymphs.
- For each nymph iteration, Lua also rolls `percent(30)` to place a fountain.
- The fill queues `make_garden_walls`, which grows the room selection after
  level generation, replaces walls with trees, and replaces secret doors with
  air to mark the level arboreal.

## Previous JS behavior

`Garden` was present in `THEMEROOM_FILL_META`, but `apply_themeroom_fill()` had
no Garden dispatch case.

## Implementation notes

- Added `themeroom_garden()` with the C `numpoints / 6` count, sleeping wood
  nymph placement, and 30% fountain rolls.
- Added a `gardenWalls` postprocess entry that applies the grown room selection
  through the existing special-level terrain replacement helper.
- When a secret door is converted to air, the JS level now marks
  `flags.arboreal`, matching the Lua comment and C behavior.

## Tests

- `themed Garden creates sleeping nymphs fountains and tree walls`
