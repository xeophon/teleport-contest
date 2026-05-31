# themed-room Teleportation hub parity

## C references

- `dat/themerms.lua` defines `Teleportation hub` by taking
  `selection.room():filter_mapchar(".")`, then repeating `2 + nh.rn2(3)` times.
- Each iteration removes one random selected coordinate with `rndcoord(1)` and
  queues a postprocess teleport trap.
- `make_a_trap()` later creates a seen teleport trap and, for `teledest = 1`,
  chooses a random floor destination whose x and y both differ from the trap
  coordinate.

## Previous JS behavior

The runtime already had inline Teleportation hub handling and postprocess trap
creation, but there was no focused coverage for the delayed trap path, seen
state, or destination constraint.

## Implementation notes

- Extracted the inline fill into `themeroom_teleportation_hub()`.
- The fill now uses the existing C-style selection helpers:
  `selection.room()`, `filter_mapchar(".")`, and `rndcoord(true)`.
- Exposed `run_themeroom_postprocess()` through test hooks so the delayed trap
  creation path can be validated directly.

## Tests

- `themed Teleportation hub postprocess creates seen destination traps`

