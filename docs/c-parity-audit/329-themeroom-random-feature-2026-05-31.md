# themed-room random dungeon feature parity

## C references

- `dat/themerms.lua` names this generator
  `Random dungeon feature in the middle of an odd-sized room`.
- The generator creates an ordinary, filled room with odd width and height:
  `3 + rn2(3) * 2`.
- It shuffles `{ "C", "L", "I", "P", "T" }` and places the first terrain at
  the exact center of the room.

## Previous JS behavior

The metadata used the shortened name `Random dungeon feature` and
`themerooms_generate()` had no matching branch. If selected, it fell through to
the generic filled-room fallback and never placed the centered terrain feature.

## Implementation notes

- Updated the metadata name to match `themerms.lua`.
- Added a dedicated generator for the odd-sized filled room.
- Reused the themed-room shuffle helper for feature selection and centralized
  lava/ice terrain side effects through a small terrain setter.

## Tests

- `themed random dungeon feature creates odd room with centered terrain`
