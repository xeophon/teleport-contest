# 668 - Hero Landmine Air Water Level Deletion

## C Source

- `nethack-c/upstream/src/trap.c:2585-2596` converts the landmine to a `PIT`, applies blast HP loss, calls `blow_up_landmine(trap)`, then only recursively calls `dotrap(..., RECURSIVETRAP)` if a trap still exists on the hero square.
- `nethack-c/upstream/src/trap.c:3178-3196` runs general blast fallout first, then re-fetches the trap because scatter or terrain changes may have removed it.
- `nethack-c/upstream/src/trap.c:3197-3199` deletes the converted trap outright on water or air levels because no pits are allowed there.
- `nethack-c/upstream/src/trap.c:3201-3215` covers later non-air/water fallout: liquid fill, visible non-owned pit conversion, and boulder pit fill.

## Port Notes

- `landminePostBlastTrap()` now models the air/water-level deletion gate after landmine HP loss and DEX exercise but before recursive pit fallout.
- Grounded hero landmine blasts on air/water levels still apply blast damage, leg wounds, and DEX exercise, but they remove the converted trap and skip recursive pit escape, pit trap state, and pit damage.
- This is intentionally narrower than full `blow_up_landmine()`: scatter, engraving deletion, wakeups, doors/drawbridges, and object damage remain separate fallout slices; same-square boulder fill is covered by `669-hero-landmine-boulder-pit-fill-2026-06-07.md`, and liquid fill is covered by `670-hero-landmine-liquid-fill-2026-06-07.md`.

## Tests

- `hero land mine on air level leaves no recursive pit`
- `hero land mine on water level leaves no recursive pit`
- Existing ordinary-level tests still cover converted-pit recursion.
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "land mine|landmine" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Same-square boulder fill after landmine pit conversion is covered by `669-hero-landmine-boulder-pit-fill-2026-06-07.md`.
- Liquid-fill terrain and hero liquid consequences are covered by `670-hero-landmine-liquid-fill-2026-06-07.md`; lava/flying canaries remain there as follow-ups.
