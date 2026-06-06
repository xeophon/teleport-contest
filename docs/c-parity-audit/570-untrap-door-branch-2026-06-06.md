# Door `#untrap` Branch

## Scope

Port the usual C `#untrap` door branch for adjacent doors after floor trap and current-square box/chest handling has not consumed the command. This covers terminal door-state messages, ordinary trapped-door search and disarm, Master Key forced search/disarm, and inactive Master Key fallback.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/include/rm.h:121` defines `IS_DOOR(typ)` as only `DOOR`; secret doors are not handled by this branch.
- `nethack-c/upstream/src/trap.c:6045` through `:6048` falls back to `You know of no traps there.` for non-door terrain when no floor trap was skipped.
- `nethack-c/upstream/src/trap.c:6051` through `:6060` handles `D_NODOOR`, `D_ISOPEN`, and `D_BROKEN` without consuming a turn.
- `nethack-c/upstream/src/trap.c:6063` through `:6069` finds trapped doors with forced detection or the ordinary `rn2(MAXULEV - u.ulevel + 11)` search roll and asks `Disarm it?`.
- `nethack-c/upstream/src/trap.c:6070` through `:6088` disarms trapped doors, with DEX exercise before the non-forced failure roll, door removal on failure, and +8 XP on success.
- `nethack-c/upstream/src/trap.c:6089` through `:6094` covers confused false positives and ordinary no-trap searches.

## JS Change

- `js/cmd.js` now checks adjacent `DOOR` terrain from `#untrap` after web/box/squeaky handling.
- Door detection and disarm use the same carried Master Key force predicate as the box/chest path.
- Forced trapped-door detection skips the ordinary search roll, and forced trapped-door disarm skips the failure roll.
- Failed trapped-door disarm removes the door and records zero-cost shop-door damage through existing shop terrain damage tracking.
- `D_NODOOR`, `D_ISOPEN`, and `D_BROKEN` door states report the C messages without consuming time.

## Tests

- `#untrap closed untrapped door consumes a normal search turn`
- `#untrap confused door false positive reports not trapped`
- `#untrap trapped door failed disarm removes the door`
- `#untrap Master Key forces trapped door discovery and disarm`
- `#untrap unblessed non-Rogue Master Key uses ordinary door search`
- `#untrap no-door door state does not consume time`
- `#untrap open-door door state does not consume time`
- `#untrap broken-door door state does not consume time`

These tests drive the real extended command input, assert exact prompts/messages, RNG call order, confused false-positive cleanup, door mask mutations, XP gain, Master Key force behavior, and turn consumption.

## Remaining Work

- The rare C continuation where the hero declines all current-square boxes/chests on a door square and then proceeds to door handling is not wired because the current JS box prompt state does not retain target coordinates for that continuation.
- Full `b_trapped("door", FINGER)` payload effects are still partial; this slice covers the immediate door-removal state and message.
