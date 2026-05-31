# themed-room Twin businesses generator parity

## C references

- `dat/themerms.lua` creates `Twin businesses` at minimum difficulty 4.
- The outer room is a 9x5 themed room.
- It selects one of eight placements for two 3x3 shop subrooms.
- The subrooms are one weapon shop and one armor shop, with a 50% chance to
  swap left/right types.
- Each shop is filled, non-joined, and gets one door with state locked 1%,
  otherwise closed 50%, otherwise open.

## Previous JS behavior

`Twin businesses` existed in the themed-room metadata but had no generation
branch, so selection fell through to the generic filled-room fallback.

## Implementation notes

- Added a dedicated generator for the 9x5 themed shell and the eight-placement
  shop pair.
- Reused the local special-level subroom and door helpers so the shop rooms keep
  normal `needfill` behavior for later stock-room processing.
- Registered generated shop doors on each subroom so shopkeeper placement and
  stocking can use the existing shop machinery.

## Tests

- `themed Twin businesses creates paired weapon and armor shops`
