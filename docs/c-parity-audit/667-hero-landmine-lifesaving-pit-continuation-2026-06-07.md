# 667 - Hero Landmine Lifesaving Pit Continuation

## C Source

- `nethack-c/upstream/src/trap.c:2533-2538` rolls landmine blast damage with `rnd(16)` before the grounded or air-current branch.
- `nethack-c/upstream/src/trap.c:2575-2585` applies grounded landmine side effects, converts the landmine into a `PIT`, then calls `losehp()` for the blast.
- `nethack-c/upstream/src/hack.c:4256-4290` has `losehp()` call `done(DIED)` when HP drops below 1.
- `nethack-c/upstream/src/end.c:1020-1115` lets `done()` return to its caller when `Lifesaved` is active, after printing the medallion and recovery messages and calling `savelife()`.
- `nethack-c/upstream/src/end.c:704-716` restores HP in `savelife()` before control returns to the original trap caller.
- `nethack-c/upstream/src/trap.c:2589-2596` continues after `losehp()` by calling `blow_up_landmine(trap)` and then recursive `dotrap(trap, RECURSIVETRAP)` if the converted trap remains.
- `nethack-c/upstream/src/trap.c:3025-3039` means the recursive pit can still take normal in-air and known-trap escape prechecks.
- `nethack-c/upstream/src/trap.c:1920-1950` sets pit trap state before normal pit damage, so any returned life-saving path leaves the hero trapped in the pit unless another branch avoided the fall.

## Port Notes

- Landmine blast life-saving no longer returns before the converted pit follow-up. After a life-saving blast, the hero is temporarily restored so the same `movementPitResult(trap, { recursive: true })` path can run.
- Grounded landmine life-saving now preserves the recursive pit result: the saved blast message is followed by `You fall into a pit!`, the converted trap becomes a seen `PIT`, and post-pit HP survives the `lifeSavingMore` prompt.
- Flying air-current landmine life-saving uses the same continuation. The restored flying hero reaches the recursive seen-pit in-air result, producing the `You fly over a pit.` tail instead of pit damage.
- The shared landmine merge lets a later fatal pit result win over an earlier saved landmine blast. A saved landmine plus nonfatal pit result keeps `lifeSavingMore` so the medallion crumble message is still shown.
- `_life_saving_post_continue_hp` is intentionally narrow: generic life-saving still restores to the existing JS full-HP model unless a trap continuation has already applied post-save fallout. Exact C `savelife()` HP restoration and CON timing remain a broader life-saving parity topic.

## Tests

- `hero land mine life saving continues into recursive pit fallout`
- `flying hero land mine life saving continues over recursive pit`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "land mine|landmine|life saving" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Exact `savelife()` HP formula and CON decrement parity remain broader than this landmine slice; this patch preserves the existing JS full-HP restore model, then applies post-save pit fallout.
- Attached-ball relocation returns landmine life-saving trap results through the existing deferred trap-result path, but it still lacks a dedicated life-saving canary.
- Full `blow_up_landmine()` terrain/object fallout remains partial, as tracked by `665-hero-landmine-recursive-pit-2026-06-07.md`.
