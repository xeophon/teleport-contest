# themed-room Massacre parity

## C references

- `dat/themerms.lua` defines `Massacre` with a fixed list of role and quest
  guardian corpse species.
- Lua chooses the initial corpse species with `math.random(#mon)`, rolls
  `d(5,5)` objects, then rerolls the species on each iteration when
  `percent(10)` succeeds.
- Each corpse is created through `des.object({ id = "corpse", montype = ... })`,
  which routes through `sp_lev.c:create_object()` and applies the explicit
  `montype` by calling `set_corpsenm()`.

## Previous JS behavior

`Massacre` was present in the themed fill metadata but had no dispatch, so it
created no corpses and skipped the fill's species/count/reroll RNG.

## Implementation notes

- Added the exact Lua corpse-species list and Massacre dispatch.
- The fill keeps the same C shape: initial species roll, `d(5,5)` count,
  per-corpse `percent(10)` reroll, random room placement, and ordinary corpse
  creation before applying the explicit species override.
- Explicit level-defined corpse sex flags are zeroed, matching `des.object()`
  with no `male`, `female`, or `historic` options.

## Tests

- `themed Massacre creates explicit role corpse piles without side effects`

