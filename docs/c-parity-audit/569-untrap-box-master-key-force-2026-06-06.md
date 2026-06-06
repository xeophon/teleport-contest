# Box `#untrap` Master Key Force

## Scope

Port the C behavior where carrying the Master Key of Thievery makes ordinary `#untrap` act as a forced untrap attempt for current-square boxes/chests. This covers both unknown trapped boxes checked via `untrap_box()` and already-known trapped boxes routed directly through `disarm_box()`.

The implementation uses deterministic command-level tests and does not use replay maps, hidden tests, fixed seeds, player names, or seed-specific shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:5865` through `:5868` upgrades `force` when `has_magic_key(&gy.youmonst)` is true.
- `nethack-c/upstream/src/artifact.c:2772` through `:2784` makes the Master Key a magic key only when it is non-cursed for Rogues or blessed for non-Rogues.
- `nethack-c/upstream/src/trap.c:5826` through `:5829` makes forced trapped-box detection unconditional, skipping the ordinary `rn2(MAXULEV + 1 - u.ulevel)` search roll and confused false-positive roll.
- `nethack-c/upstream/src/trap.c:5796` through `:5812` makes forced trapped-box disarm skip the `rnd(75 + level_difficulty() / 2)` failure roll and award the successful-disarm path.
- `nethack-c/upstream/src/trap.c:6004` through `:6018` passes the same `force` flag into either direct known-box `disarm_box()` or unknown-box `untrap_box()`.
- `nethack-c/upstream/src/artifact.c:1838` through `:1844` shows artifact `#invoke` uses `untrap(TRUE, ...)`; this note only covers the ordinary `#untrap` carried-Master-Key upgrade.

## JS Change

- `js/cmd.js` now detects a carried Master Key of Thievery by artifact-style inventory names and C's active magic-key BUC rule instead of using the quest-artifact progress flag.
- Current-square box/chest prompt state now carries the resulting `force` flag.
- The web-plus-container `n` path preserves that flag when it skips the web and proceeds to the box/chest prompt.
- Known observed boxes pass `force` into direct `disarmUntrapBox()`, and unknown boxes pass it into `checkUntrapBox()`.

## Tests

- `#untrap Master Key forces box trap discovery and disarm`
- `#untrap unblessed non-Rogue Master Key uses ordinary box search`
- `#untrap Master Key force survives skipped web prompt for known box`

These tests drive the real extended command input, assert the Master Key skips ordinary search/failure RNG when its BUC state qualifies, verify successful disarm state and XP, cover the unblessed non-Rogue non-force case, and cover force propagation through the current-square web-skip prompt.

## Remaining Work

- This does not implement the full artifact `#invoke` untrap surface for every trap/door target.
- Full `chest_trap()` payload effects are still partial and tracked from `565-untrap-box-one-shot-failure-2026-06-06.md`.
