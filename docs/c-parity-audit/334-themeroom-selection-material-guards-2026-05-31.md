# Themed-room selection and material guards

## Source

- `nethack-c/upstream/dat/themerms.lua:267`: `Teleportation hub` calls
  `selection.room():filter_mapchar(".")`, then queues a trap only when the
  room-local `rndcoord(1)` result has `pos.x > 0`.
- `nethack-c/upstream/src/nhlsel.c:413`: room selections returned to Lua are
  translated by subtracting `croom->lx` and `croom->ly`.
- `nethack-c/upstream/dat/themerms.lua:793`: the water-vault escape chest is
  forced unlocked only when `itm:class()["material"] == "glass"`.
- `nethack-c/upstream/src/nhlobj.c:222`: that Lua object class field reports
  the object row's material, not shuffled appearance text.

## JS gap

- `Teleportation hub` used an absolute `pos.x > 0` guard. Since ordinary
  themed rooms are never placed at absolute column zero, a one-column room could
  still queue traps even though Lua would skip every local-left-column point.
- `Water-surrounded vault` unlocked the escape-item chest when the selected
  wand's shuffled appearance was `glass` or `crystal`. Lua checks actual object
  material, so the four scripted escape items should not unlock merely because
  their randomized description looks glassy.

## Change

- Compared teleport hub coordinates against `croom.lx`, preserving the Lua
  room-local left-column guard while keeping stored trap coordinates absolute.
- Added a narrow water-vault unlock predicate that checks explicit
  `material`/`oc_material == "glass"` and ignores shuffled appearances.
- Broadened tests for water-vault chest coordinates, contained escape item
  ownership, the material predicate, and the teleport hub left-column skip.

