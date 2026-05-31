# themed-room Mausoleum generator parity

## C references

- `dat/themerms.lua` creates `Mausoleum` as a themed room with odd dimensions
  `5 + rn2(3) * 2`.
- It creates a centered 1x1 themed subroom with `joined = false`.
- The tomb contents are either a waiting monster from shuffled classes
  `{ "M", "V", "L", "Z" }` with 50% chance, or a corpse with `montype = "@"`.
- The tomb has a 20% chance of a secret door.

## Previous JS behavior

`Mausoleum` existed in the themed-room metadata but had no generation branch, so
selection fell through to the generic filled-room fallback.

## Implementation notes

- Added a dedicated async Mausoleum generator.
- Reused the generalized themed subroom helper for the centered non-joined 1x1
  tomb.
- Added a small secret-door helper matching the existing random-door wall search
  shape.
- The corpse branch uses the local class-monster selection for `@` corpses and
  restarts corpse display/timer state after assigning the corpse species.

## Tests

- `themed Mausoleum creates centered tomb subroom contents`
