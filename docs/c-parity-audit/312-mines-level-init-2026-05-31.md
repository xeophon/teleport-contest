# Mines level_init parity

## Upstream anchors

- `sp_lev.c:3004` handles `LVLINIT_MINES`: random/default lit is resolved before `mkmap()`, optional solid fill runs, `icedpools` is copied, then `mkmap()` owns map generation.
- `sp_lev.c:3837` parses `des.level_init()` with default `smoothed=false`, `joined=false`, and `walled=false`.
- `mkmap.c:451` runs pass one and pass two unconditionally; only the two pass-three smoothing iterations are gated by `smoothed`.
- `mkmap.c:331` finalizes lit maps by lighting tree backgrounds, marking generated room light state, always lighting lava, and tagging ice as pool or moat ice.

## JS gap

`splevMinesLevelInit()` treated Mines-style special maps as implicitly smoothed,
joined, and walled. That matched a few current hand-written callers only because
those callers came from data files that explicitly request those options. It was
not C-shaped for generic `des.level_init({ style = "mines" })`, and it made
future special-level ports inherit smoothing and joining even when upstream Lua
omits them.

The helper also skipped two `finish_map()` details that are shared by quest and
Mines-style fillers: lit tree backgrounds and generated ice metadata.

## Change

- Split the mkmap pass pipeline so pass one and pass two always run, while the
  pass-three pair is controlled by `smoothed`.
- Changed `splevMinesLevelInit()` defaults to C-shaped `joined=false`,
  `walled=false`, and `smoothed=false`.
- Made existing callers for Bar filler, Orcish Town, and Grotto Town pass their
  upstream explicit `smoothed=true`, `joined=true`, and `walled` settings.
- Extended `mkmap_finish()` to light tree backgrounds, set `rlit` on lit joined
  rooms, and tag `ICE` as `ICED_POOL` or `ICED_MOAT`.

## Tests

Added focused `mklev` tests which avoid replay or public-seed expectations:

- `smoothed=false` keeps the unsmoothed pass order, while `smoothed=true`
  produces a different terrain result through pass-three.
- omitted `joined`/`walled` options do not create cavernous joined maps, while
  explicit joined+walled settings do.
- `mkmap_finish()` lights tree background terrain, sets lit room metadata, and
  records pool-vs-moat ice metadata.

