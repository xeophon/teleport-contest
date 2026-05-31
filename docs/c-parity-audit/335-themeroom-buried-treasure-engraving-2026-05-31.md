# Themed-room buried treasure engraving offset

## Source

- `nethack-c/upstream/dat/themerms.lua:140`: the `Buried treasure` fill stores
  the buried chest's object coordinates in postprocess data.
- `nethack-c/upstream/dat/themerms.lua:1055`: `make_dig_engraving()` computes
  the x direction as `data.x - pos.x - 1`, while y remains `data.y - pos.y`.

## JS gap

The JS postprocess stored the same buried chest coordinates, but
`themeroomDigEngravingText()` used `target.x - pos.x` without Lua's extra
leftward x-cell adjustment.

## Change

- Matched Lua's `data.x - pos.x - 1` direction formula.
- Updated the Buried treasure test expectation to encode that source formula.

