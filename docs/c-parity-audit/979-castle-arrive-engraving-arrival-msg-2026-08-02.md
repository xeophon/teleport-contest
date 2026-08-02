# Audit 979 — seed9012-arrive-castle: tower Elbereth engraving + single-object arrival message (2026-08-02)

## Scope this wave

Wave-5 continuation target. Castle arrival-level parity for
sessions-extra/seed9012-arrive-castle.session.json: wizard name-levelport
to the (horizontally flipped) castle followed by `#wizmap`.  Base metrics
on arrival: RNG 12361/12361 (full), screens 15/18.  After the port:
**PASS (18/18)**.

## Diagnosis method

Per-step screen diff via tools/screenstepdiff9102.mjs against the decoded
recorded grids (frozen/screen-decode.mjs), colored-cell inspection
(ch/color/decgfx triple), and gstate probes of the post-run level (terrain
types, objects, engravings).  Map-to-screen mapping is (x-1, y+1);
castle.des coordinates map to internal (71-desx, desy+3) after the seed's
lHORIZONTAL flip (CASTLE_XSTART=9, width 63).

Two independent screen-only divergences, zero RNG drift:

1. Steps 16/17 (#wizmap): one cell at the wishing-tower square rendered
   '`' bright-blue with decgfx=0 — that is `S_engroom` ("engraving in a
   room", defsym.h:114 area, CLR_BRIGHT_BLUE), NOT water (moat cells are
   CLR_BLUE and SO/SI-wrapped in DECgraphics).  dat/castle.lua:147-149
   burns "Elbereth" under the wand chest; wizcmds.c:188-191 wiz_map
   calls map_engraving(ep, TRUE) for every engraving before do_mapping(),
   and detect.c:1372 show_map_spot → map_engraving repaints it per cell.
   The JS castle builder never created this engraving (its
   des.engraving port was missing).  The display- and wizmap-side support
   for erevealed engravings was already present (js/cmd.js wizmap branch
   sets erevealed=true; js/display.js _map_location paints '`'
   CLR_BRIGHT_BLUE when erevealed !== false).

2. Step 8 (levelport arrival): "You see here 47 gold pieces." missing.
   C path: do.c:1996 `(void) pickup(1)` in the goto_level tail; with
   !autopickup that is pickup.c:724-731 → check_here(FALSE) (pickup.c:430)
   → look_here(1, LOOKHERE_NOFLAGS) (pickup.c:447-453) → invent.c:4282
   `You("see here %s.", doname_with_price(otmp))` for a lone 47-gold pile.
   The JS finishLevelTeleport verbose=false arrival chain had no
   single-object branch outside shop/valley greetings.

## What was ported / fixed (C refs)

- js/mklev.js make_castle_level: create the wishing-tower square
  engraving — `make_engr_at(towerX, towerY, 'Elbereth', false, 0, BURN)`
  with `erevealed = false` (sp_lev des.engraving default; revelaed only
  on read/sees/mapped).  Refs: dat/castle.lua:147-149, display.c:313,
  wizcmds.c:188-191, engrave.h:47.
- js/cmd.js finishLevelTeleport: `arrivalObjects.length === 1` branch in
  the verbose=false arrival chain printing
  `You ${blind?'feel':'see'} here ${pickupObjectPhrase(obj)}.`
  Refs: do.c:1996, pickup.c:430-454, pickup.c:722-731, invent.c:4276-4283.

## Tests

- test/castle-wishing-engraving.test.mjs (new, 2 cases): builds the castle
  through the real mklev() dispatch at seeds 1/7/9012 and asserts exactly
  one cursed scare-monster scroll sharing a square with a locked,
  untrapped chest and a BURN 'Elbereth' engraving with erevealed === false,
  and asserts moat + DRAWBRIDGE_UP presence.

## Verification results (final)

- jsmain import: loads OK.
- `node --test test/castle-wishing-engraving.test.mjs`: 2/2 pass.
- Target session: PASS — RNG 12361/12361, screens 18/18, cursors 18/18.
- `bash frozen/score.sh`: 49/49 passing (all publics green).

## Remaining unported in this subsystem

- `des.engraving` full generality: this port covers castle-style fixed
  BURN Elbereth; other .lua engraving options (ereveal=, random engraving
  pools from engrave.txt on special levels without text, epitaphs beyond
  existing grave code) are only partly exercised elsewhere.
- C's exact wizmap ordering nuance: wizard wiz_map does not set
  ep->erevealed (the painted glyph lives in levl memory); the JS sets
  erevealed=true as a sticky surrogate.  Equivalent for out-of-sight map
  memory; a hero who later gains sight over the engraved square would in
  C see the chest glyph (newsym recomputation) — the JS engraving branch
  sits after visible-object handling in _map_location, so in-sight
  behavior also matches, but corner cases (eroaming after read_engr_at
  eread/erevealed interplay) are untested by public sessions.
- check_here()'s full plating (pickup.c:430-454): LOOKHERE_PICKED_SOME,
  pile_limit>=5 "several objects" counting text, and corpses-that-petrify
  warnings on arrival are not separately exercised here.
