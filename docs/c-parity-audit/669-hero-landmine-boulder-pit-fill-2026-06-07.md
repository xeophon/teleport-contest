# 669 - Hero Landmine Boulder Pit Fill

## C Source

- `nethack-c/upstream/src/trap.c:2585-2597` converts a triggered hero landmine to a pit, calls `blow_up_landmine(trap)`, recursively enters the pit only if a trap still exists, then calls `fill_pit(u.ux,u.uy)` again after recursive fallout.
- `nethack-c/upstream/src/trap.c:3193-3215` re-fetches the converted trap after blast scatter, applies air/water deletion or visible pit conversion, then calls `fill_pit(x,y)` before returning to the recursive `dotrap()` gate.
- `nethack-c/upstream/src/trap.c:4008-4018` implements `fill_pit()`: a same-square boulder is extracted from the floor and routed through `flooreffects(..., "settle")` when the square has a pit or hole trap.
- `nethack-c/upstream/src/do.c:187-269` handles the boulder floor effect: occupant consequences, visible/heard fill messages, trap deletion, boulder use-up, object burial, and `newsym()`.

## Port Notes

- `landmineRecursivePitTrap()` now runs the post-blast air/water deletion gate, then attempts same-square boulder filling before recursive pit fallout.
- `fillLandminePitWithBoulder()` follows the existing attached-ball `fill_pit()` port shape: find the same-square boulder, remove it from `game.level.objects`, then reuse `earthFloorEffects(..., "settle")` with used-up shop bill preservation.
- If the boulder floor effect deletes the converted pit, the wrapper re-checks `game.level.traps` and skips recursive `movementPitResult()`, matching C's `if ((trap = t_at(u.ux,u.uy)) != 0)` gate.

## Tests

- `deferred hero land mine blast fills resulting pit with same-square boulder`
- `attached ball fallback land mine blast fills resulting pit with same-square boulder`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "land mine|landmine" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- The post-recursive `fill_pit(u.ux,u.uy)` call at `nethack-c/upstream/src/trap.c:2597` still needs a dedicated scenario if recursive pit fallout can leave a fillable same-square boulder state not already consumed by `blow_up_landmine()`.
- Full `blow_up_landmine()` fallout remains partial: scatter, engraving deletion, wakeups, doors/drawbridges, liquid fill, `maybe_dunk_boulders()`, `recalc_block_point()`, and `spot_checks()` are outside this slice.
