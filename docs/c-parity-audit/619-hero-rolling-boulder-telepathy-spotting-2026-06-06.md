# Hero Rolling Boulder Telepathy Spotting

Date: 2026-06-06

## Scope

Cover the telepathy portion of C `canspotmon()` for hero-triggered rolling boulder monster hit and death wording.

This slice is state-driven and does not use replay maps, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/include/display.h:41` through `:50` defines `tp_sensemon()`: the target must not be mindless, blind telepathy works at any range, and unblind telepathy works only within `u.unblind_telepat_range`.
- `nethack-c/upstream/include/display.h:55` through `:58` defines `sensemon()` as monster detection, telepathy, or matching warn-of-monster-type, with swallowed/underwater exclusions.
- `nethack-c/upstream/include/display.h:92` through `:95` defines `mon_visible()` as not invisible without see-invisible and not undetected.
- `nethack-c/upstream/include/display.h:117` through `:120` defines `canseemon()` as visible/infravision location plus `mon_visible()`.
- `nethack-c/upstream/include/display.h:123` through `:129` defines `canspotmon(mon)` as `canseemon(mon) || sensemon(mon)`.
- `nethack-c/upstream/include/hack.h:1135` through `:1140` keeps `MATCH_WARN_OF_MON()` tied to warn-of-monster-type, not generic warning glyph sources.
- `nethack-c/upstream/src/mthrowu.c:384` through `:398` gates hit messages on the impact square being visible.
- `nethack-c/upstream/src/mthrowu.c:455` through `:458` uses `canspotmon()` to choose killed vs destroyed wording for ordinary lethal monster hits.

## JS Coverage

- `sensesTelepathically()` is now exported from `display.js`, so combat wording reuses the same mindless, blind, source, and unblind-range checks as map display.
- `heroRollingBoulderMonsterCanBeSpotted()` now treats telepathically sensed monsters as spotted before falling back to physical visibility.
- Hidden or invisible brain-bearing monsters sensed by a worn telepathy helm can now be named in visible hit/death lines.
- Mindless invisible monsters remain anonymous even with telepathy.
- Unblind telepathy respects `game.u.unblind_telepat_range` for this wording path.
- Hit/miss output still requires `cansee(hitpos)`, so this change only affects the target/death name chosen once a visible collision line is already being printed.

## Tests

- `hero rolling boulder telepathy names hidden target`
- `hero rolling boulder telepathy names invisible lethal target`
- `hero rolling boulder telepathy ignores mindless invisible target`
- `hero rolling boulder out-of-range unblind telepathy does not name invisible target`

## Remaining Edges

- Monster detection and specific warn-of-monster-type sensing remain separate from this telepathy slice.
- Infravision is still not part of `heroRollingBoulderMonsterCanBeSpotted()`.
- Broader `drop_throw()` impact-square fallout remains open for object-gone stopping, floor placement/stacking, shop billing, and same-square floor effects.
- Shifted-vampire revival and special-object lethal attribution remain separate `ohitmon()` slices.
