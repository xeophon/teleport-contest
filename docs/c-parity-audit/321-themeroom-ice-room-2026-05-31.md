# themed-room Ice room parity

## C references

- `dat/themerms.lua` defines `Ice room` by taking `selection.room()`, applying
  `des.terrain(ice, "I")`, then running `percent(25)`.
- On the timer branch, Lua computes `mintime = 1000 - nh.level_difficulty() *
  100` and iterates the room selection, calling `nh.start_timer_at(x, y,
  "melt-ice", mintime + nh.rn2(1000))` for each selected point.

## Previous JS behavior

`Ice room` was present in the themed fill metadata but had no dispatch, so the
fill did not alter terrain or consume the `percent(25)` and timer RNG.

## Implementation notes

- Added an `Ice room` fill dispatch.
- The fill materializes the current C-style room selection to preserve the
  same x-major iteration order for terrain and optional timers.
- Melt timers are written directly with the Lua timeout formula. The generic JS
  `startMeltIceTimeout()` helper intentionally is not used because it performs a
  different randomized timeout search for ordinary ice creation.

## Tests

- `themed Ice room converts room terrain and gates C melt timers`

