# 733 - Ready Welded Primary Weapon

## C Source

- `nethack-c/upstream/src/wield.c:568-574` checks the currently wielded primary weapon before ordinary ready confirmation. If it is welded, `doquiver_core()` prints `weldmsg(uwep)`, resets removal state, and returns before changing `uquiver`.
- `nethack-c/upstream/src/wield.c:1053-1056` makes `welded(obj)` learn the curse status when the primary weapon will weld.
- `nethack-c/upstream/src/wield.c:1064-1072` formats `weldmsg()` as welded to `hand` for one-handed objects and `hands` for two-handed objects.
- `nethack-c/upstream/src/dothrow.c:543-585` preserves the `doquiver_core("fire")` result. A newly learned welded weapon spends time and does not continue into a direction prompt.

## Port Notes

- `Q` and manual `f` now stop immediately when selecting a cursed primary wielded weapon that C would treat as welded.
- Unknown curse status is learned, the inventory line is refreshed with `cursed`, and the command consumes one move.
- Known cursed welded primaries print the welded message without consuming time.
- Two-handed primary weapons use `hands` in the welded message.
- The path also accepts the existing JS `welded: true` representation and normalizes it to cursed before rebuilding the line.
- Manual `f` clears pending fire count state and does not enter direction mode for this welded-primary branch.

## Tests

- `Q command selecting unknown cursed primary weapon reports weld and spends time`
- `Q command selecting known cursed two-handed primary weapon reports welded hands without time`
- `Q command treats explicit welded primary flag as cursed weld`
- `f command selecting unknown cursed primary weapon reports weld without direction prompt`

## Remaining Follow-Ups

- Ready-menu count editing still does not mirror every C `get_count()` editing key.
