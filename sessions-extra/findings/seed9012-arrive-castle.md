# Findings: seed9012-arrive-castle

## What the session covers (ground truth, recorded with C recorder)

Wizard "Tuner" (neutral, human, wizard mode), seed 9012, datetime
20260720093000, `OPTIONS=!autopickup,!verbose,...,symset:DECgraphics`.

- `^V` name-levelport `castle` (dungeon.c lev_by_name), which lands the
  hero on the castle west-side arrival region stair-square next to the
  east tower `<` (this seed's castle map is flipped horizontally —
  `noflipy` in castle.lua skips the vertical roll; the flp&2 roll is
  taken).
- `#wizmap` full-level reveal, then a space.

## Final JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9012-arrive-castle.session.json`
**PASS — RNG 12361/12361, Screens 18/18 (cursors 18/18).**

Base state was RNG 12361/12361, screens 15/18: three screen-only misses.

## Divergence 1 (steps 16-17): missing Elbereth engraving on the wishing tower

The recorded wizmap screen shows a bright-blue backtick at the south-west
tower square (internal (13,17), i.e. des (58,14) after the horizontal
flip) instead of room floor.  That cell is not terrain: it is `S_engroom`
(defsym.h:114 region: `PCHAR2(21, '`', S_engroom, ..., CLR_BRIGHT_BLUE)`),
the "engraving in a room" symbol.  castle.lua:147-149
(`des.engraving({ coord = loc, type="burn", text="Elbereth" })`) burns
Elbereth under the wand-of-wishing chest, and wizard `#wizmap` reveals
every engraving on the level (wizcmds.c:188-191 `map_engraving(ep, TRUE)`
→ display.c:313 map_engraving → display.h:633 engraving_to_glyph →
engrave.h:47 engraving_to_defsym → S_engroom for non-CORR terrain; then
detect.c:1372 show_map_spot re-asserts it per cell during do_mapping()).

The JS castle generator (make_castle_level, js/mklev.js) created the
chest + contents + cursed scare-monster scroll but never created the
engraving.  Fix: create `make_engr_at(towerX, towerY, 'Elbereth', false, 0,
BURN)` with `erevealed = false` (C default: unrevealed), mirroring the
existing Sokoban prize-engraving port in make_sokoban_reward_objects.
The previously-ported wizmap handler (js/cmd.js:wizmap branch) already
sets `erevealed = true` for all engravings, and the display layer already
renders a revealed engraving as '`' CLR_BRIGHT_BLUE (js/display.js
`_map_location` engraving branch), so level-gen was the only missing
piece.  No RNG consumed (des.engraving with fixed text consumes none, and
RNG parity was already full).

## Divergence 2 (step 8): missing "You see here 47 gold pieces."

On levelport arrival the hero lands on the castle arrival square where
level-gen dropped a 47-gold-pieces pile.  C's goto_level tail calls
`(void) pickup(1)` (do.c:1996); with `!autopickup` (flags.pickup false)
pickup() falls into its `autopickup && !flags.pickup` branch →
`check_here(FALSE)` (pickup.c:724-731) → `look_here(ct=1,
LOOKHERE_NOFLAGS)` (pickup.c:447-453) → the single-object branch
`You("see here %s.", doname_with_price(otmp))` (invent.c:4276-4283).

The JS finishLevelTeleport arrival-message chain (js/cmd.js) handled the
single-object "You see here" only inside the shop-greeting and valley
branches and the >1-object overlay case, dropping the plain single-object
arrival message entirely.  Fix: add an `arrivalObjects.length === 1`
branch emitting
`You ${blind ? 'feel' : 'see'} here ${pickupObjectPhrase(obj)}.` in the
verbose=false chain.

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js')"` — loads OK.
- `node --test test/castle-wishing-engraving.test.mjs` — 2/2 pass
  (engraving co-located with locked chest + cursed scare scroll at the
  tower, BURN type, starts erevealed=false, exactly one scripted
  engraving; moat + drawbridge presence).
- target: PASS (RNG 12361/12361, screens 18/18).
- all sessions-extra that passed at base still pass; failing extras
  unchanged failures (other subsystems).
- `bash frozen/score.sh` — 49/49 passing.
