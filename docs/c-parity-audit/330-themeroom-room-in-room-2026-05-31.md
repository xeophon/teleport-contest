# themed-room room-in-room generator parity

## C references

- `dat/themerms.lua` `Fake Delphi` creates an ordinary 11x9 filled room with a
  fixed 3x3 filled ordinary subroom at local `(4,3)` and one random door.
- `Room in a room` creates an ordinary filled room with an ordinary subroom and
  one random door. The inner room is not filled.
- `Huge room with another room inside` creates an ordinary filled room sized
  `rn2(10)+11` by `rn2(5)+8`, then has a 90% chance to add a filled ordinary
  subroom with one random door and a 50% chance of a second random door.

## Previous JS behavior

`Fake Delphi` only created its outer room. `Room in a room` and
`Huge room with another room inside` had metadata entries but no dispatch
branches, so they fell through to the generic filled-room fallback.

## Implementation notes

- Generalized the themed subroom helper to support fixed coordinates, fill
  state, room type, and joining state while preserving the previous filled
  random-subroom default used by `Nesting rooms`.
- Added dedicated generators for the three Lua room-in-room families.
- Marked parent rooms irregular after subroom creation, matching the existing
  special-level room builder behavior.

## Tests

- `themed room-in-room generators create C-shaped subrooms and doors`
