# themed-room Water-surrounded vault exclusion parity

## C references

- `dat/themerms.lua` creates `Water-surrounded vault` as a 6x6 moat map with a
  2x2 themed vault room.
- The Lua generator adds `des.exclusion({ type = "teleport", region = { 2,2,
  3,3 } })` over the vault floor.
- `mkmaze.c:is_exclusion_zone()` makes an `LR_TELE` exclusion block
  `LR_TELE`, `LR_UPTELE`, and `LR_DOWNTELE` level-arrival placement.
- Ordinary same-level teleport validation does not consult this exclusion.

## Previous JS behavior

The JS water-vault branch created the chests and undead but left the region as
ordinary and had no level-arrival exclusion storage, so `place_lregion()` could
select the sealed vault floor.

## Implementation notes

- Added `GameMap.exclusionZones` plus local `add_exclusion_zone()` and
  `is_exclusion_zone()` helpers.
- Updated `place_lregion()` random and deterministic candidate checks to reject
  matching exclusion zones.
- Registered the water vault's inner 2x2 floor as an `LR_TELE` exclusion and
  marked the region as `THEMEROOM`.
- Kept the vault's shuffled nasty-undead list on the Lua species names,
  including `vampire lord`.

## Tests

- `themed Water-surrounded vault records teleport exclusion for level arrivals`
- `level-region exclusions follow C teleport direction matching`
- `place_lregion skips teleport-excluded arrival squares`
