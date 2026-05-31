# themed-room Spider nest parity

## C references

- `dat/themerms.lua` defines `Spider nest` as
  `selection.room():percentage(30)` followed by web traps at each selected
  point.
- The room computes `spooders = nh.level_difficulty() > 8`; only then does it
  roll `percent(80)` for the Lua `spider_on_web` flag.
- `sp_lev.c:create_trap()` passes `MKTRAP_NOSPIDERONWEB` when
  `spider_on_web` is false.
- `mklev.c:mktrap()` creates a giant spider on a web only when the
  no-spider-on-web flag is absent.

## Implementation notes

- Added the `Spider nest` themed fill to the JS dispatch.
- Reuses `selection.room().percentage(30)` and x-major selection iteration.
- Creates explicit web traps for all selected room cells.
- Consumes the extra per-web `rn2(100)` spider roll only above level difficulty
  8, then places a giant spider on successful rolls.

## Tests

- `themed Spider nest gates web spiders by C difficulty`

## Remaining gaps

This covers only the fill content. The broader themed-room lifecycle and the
more terrain-heavy fills such as Ice room, Cloud room, Garden, and Buried
treasure remain separate work.
