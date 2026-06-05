# Mounted Hero Sleep Gas Trap Steed

## Scope

Port the C mounted hero `SLP_GAS_TRAP` `steedintrap()` branch. Before this slice, JS had a narrow hero-only sleep-gas handler for `#sit` and ordinary movement over sleeping gas traps did not resolve the C trap effect. Mounted steeds also never received the post-hero sleep-gas effect.

No replay maps, hidden tests, seeds, player names, or runtime shortcuts are used.

## C Reference

- `nethack-c/upstream/src/trap.c:1563` through `:1578` marks the trap, applies the hero sleep-gas effect, then unconditionally calls `steedintrap(trap, NULL)`.
- `nethack-c/upstream/src/trap.c:1570` through `:1577` makes sleep-resistant or breathless heroes get `You are enveloped in a cloud of gas!`; otherwise the hero gets `A cloud of gas puts you to sleep!` and consumes `rnd(25)`.
- `nethack-c/upstream/src/trap.c:3102` through `:3140` syncs the steed to the hero square, checks `SLP_GAS_TRAP`, and only consumes the steed `rnd(25)` when the steed is not sleep-resistant, breathless, or helpless.
- `nethack-c/upstream/src/mhitm.c:1223` through `:1245` shows `sleep_monst(..., -1)` skips magic-resistance class checks, sets `mcanmove = 0`, extends `mfrozen`, and returns whether the monster was affected.
- `nethack-c/upstream/src/trap.c:2953` through `:2954` routes sleep gas through the ordinary trap selector.

## JS Change

- `js/cmd.js` now has a trap-gas monster sleep helper that uses C-style sleep resistance, breathlessness, helplessness, `mcanmove`, and `mfrozen` state without applying potion-class resistance.
- Sleep-gas hero handling now returns a shared trap result used by `#sit` and movement.
- Mounted sleep-gas traps now apply hero gas first, then sync and affect the steed with a second `rnd(25)` only when the steed is susceptible.
- Ordinary movement over `SLP_GAS_TRAP` now resolves the trap effect instead of silently continuing.
- In-air movement over sleeping gas traps now follows the C floor-trigger skip: seen traps report crossing over them, hidden traps do nothing and stay hidden.

## Tests

- `mounted hero sleep gas trap sleeps hero then steed`
- `mounted hero sleep gas trap still sleeps steed when hero resists`
- `mounted hero sleep gas trap does not reroll for helpless steed`
- `known sleep gas trap can be escaped before gas effects`
- `flying hero crosses hidden sleep gas trap without gas effects`

The tests use local trap and steed fixtures with explicit RNG queues. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

The remaining C `steedintrap()` cases after arrows, darts, and sleep gas are `LANDMINE`, `PIT`, `SPIKED_PIT`, and `POLY_TRAP`. Mounted `BEAR_TRAP` is also still a small adjacent branch, but it lives in `trapeffect_bear_trap()` rather than `steedintrap()`.
