# themed-room Ghost of an Adventurer parity

## C references

- `dat/themerms.lua` selects `selection.room():rndcoord(0)` for the ghost
  coordinate.
- The fill creates a sleeping, waiting ghost at that coordinate.
- Optional dagger, weapon, bow+arrow, armor, ring, and scroll objects all use
  the same coordinate and `buc = "not-blessed"`.

## Previous JS behavior

The JS helper existed only for map-backed themed rooms because
`apply_themeroom_fill()` required `rows`. It also created optional loot at
`(0,0)` rather than the selected ghost coordinate.

## Implementation notes

- Replaced the row-backed coordinate selection with `selection.room()` so the
  fill works for ordinary and map-backed themed rooms.
- Preserved the existing ghost-generation RNG scaffolding and object chance
  rolls.
- Moved every optional object to the selected ghost coordinate and cleared
  `blessed` to match the Lua `not-blessed` BUC constraint.

## Tests

- `themed Ghost of an Adventurer places ghost loot on the ghost square`
