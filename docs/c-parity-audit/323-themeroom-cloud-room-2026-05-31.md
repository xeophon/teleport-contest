# themed-room Cloud room parity

## C references

- `dat/themerms.lua` defines `Cloud room` by taking `selection.room()`,
  creating one sleeping `fog cloud` for each quarter of the room points, and
  then calling `des.gas_cloud({ selection = fog })`.
- `sp_lev.c:lspo_gas_cloud()` routes selection clouds to
  `region.c:create_gas_cloud_selection()`, which creates one visible gas-cloud
  region over the selected points without the randomized spread/TTL path used
  for point clouds.
- `sp_lev.c:create_monster()` tries `enexto()` when a random special-level
  monster coordinate is already occupied.

## Previous JS behavior

`Cloud room` was present in the themed fill metadata but had no dispatch, so it
created neither sleeping fog clouds nor the room-wide harmless gas-cloud region.

## Implementation notes

- Added `createGasCloudSelection()` for C-style selection gas clouds. Unlike
  `createGasCloud()`, it copies the selected points directly and does not roll
  cloud growth or TTL.
- Added `Cloud room` fill dispatch using `selection.room()` point counts,
  sleeping fog cloud creation, and a selection gas region over the full room.
- The fog-cloud placement uses the existing one-shot occupied-square relocation
  hook to mirror special-level `enexto()` behavior.

## Tests

- `themed Cloud room creates sleeping fog clouds and a room gas region`

