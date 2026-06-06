# Hero Rolling Boulder Warn-Of-Monster Spotting

Date: 2026-06-06

## Scope

Cover C `MATCH_WARN_OF_MON()` as a `canspotmon()` source for hero-triggered rolling-boulder monster naming and lethal `killed` versus `destroyed` wording.

This slice is state-driven and does not use replay maps, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/include/youprop.h:168` through `:170` defines `Warn_of_mon` as intrinsic or extrinsic warning of monster type.
- `nethack-c/upstream/include/context.h:87` through `:92` stores warning masks and warned species in `svc.context.warntype`.
- `nethack-c/upstream/include/hack.h:1135` through `:1140` matches warned monsters by object mask, polymorphed mask, or exact warned species.
- `nethack-c/upstream/include/display.h:55` through `:58` routes `MATCH_WARN_OF_MON(mon)` through `sensemon()` with swallowed and underwater restrictions.
- `nethack-c/upstream/include/display.h:129` defines `canspotmon(mon)` as `canseemon(mon) || sensemon(mon)`.
- `nethack-c/upstream/src/mthrowu.c:455` through `:457` uses `canspotmon(mtmp)` for lethal rolling-boulder wording while keeping ordinary hit/death message emission gated by impact-square visibility.

## JS Coverage

- Rolling-boulder monster spotting now recognizes C-shaped `Warn_of_mon` state plus `warntype.obj`, `warntype.polyd`, and `warntype.species`.
- Existing monster metadata is mapped to the relevant C `M2_*` warn categories for masks, with direct numeric `mflags2`/`m2` values also accepted when present.
- Generic `Warning`/warning glyph state remains separate and does not satisfy `MATCH_WARN_OF_MON()`.
- The shared `sensemon()` swallowed and underwater restrictions now gate monster detection, telepathy, and warn-of-monster-type spotting for this rolling-boulder path.
- Hit/death messages are still emitted only when the impact square is normally visible, matching `ohitmon()`'s `vis = cansee(...)` behavior.

## Tests

- `hero rolling boulder warn-of-monster-type mask names hidden lethal target`
- `hero rolling boulder warn-of-monster species names hidden lethal target`
- `hero rolling boulder generic warning does not name hidden warned-type target`

## Remaining Edges

- Full global `Warn_of_mon` display integration remains separate from this command-local `canspotmon()` bridge.
- Infravision spotting through `couldsee()` remains a separate `canseemon()` parity slice.
- Broader monster `mflags2` canonicalization belongs with the monster registry rather than this rolling-boulder command path.
