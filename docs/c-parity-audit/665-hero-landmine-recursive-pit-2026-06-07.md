# 665 - Hero Landmine Recursive Pit Fallout

## C Source

- `nethack-c/upstream/src/trap.c:2533-2538` rolls landmine blast damage with `rnd(16)` before hero-specific branching and applies iron-shoe reduction.
- `nethack-c/upstream/src/trap.c:2575-2581` applies grounded landmine effects: optional steed landmine damage, two leg wounds, and the landmine dexterity exercise.
- `nethack-c/upstream/src/trap.c:2585-2596` converts the mine to a non-owned pit, applies landmine HP loss, calls `blow_up_landmine()`, then recursively calls `dotrap(trap, RECURSIVETRAP)` if a trap remains on the hero square.
- `nethack-c/upstream/src/trap.c:3209-3211` makes the resulting pit visible and non-owned when no liquid or air/water-level deletion removes it.
- `nethack-c/upstream/src/trap.c:3025-3039` means the recursive pit still gets the ordinary non-forced floor-trigger prechecks, including the visible-pit `rn2(5)` escape prelude.
- `nethack-c/upstream/src/trap.c:1868-1890` gives recursive mounted pit wording as `You and <steed> fall into a pit!`.
- `nethack-c/upstream/src/trap.c:1920-1950` sets pit trap state with `rn1(6, 2)` and applies normal pit damage.
- `nethack-c/upstream/src/trap.c:3145-3148` applies recursive pit damage to a surviving steed with `rnd(6)`, letting the hero skip unmounted pit damage while still becoming trapped.

## Port Notes

- `convertLandmineToPit()` now marks the converted pit as seen, matching C's visible generated pit before recursive `dotrap()`.
- Landmine HP loss no longer sets pit trap state directly; pit state is owned by the converted pit result.
- `heroLandmineResult()` now calls `movementPitResult(trap, { recursive: true })` after nonfatal blast damage, so visible-pit escape, pit state, pit damage, and mounted steed pit damage use the existing movement pit helper.
- `heroPitResult()` accepts a recursive option solely to match the C mounted wording while leaving ordinary mounted pit movement unchanged.

## Tests

- `hero land mine movement explodes into pit and wounds hero`
- `hero land mine recursive pit can be escaped after blast`
- `mounted hero land mine damages steed and hero`
- `mounted hero land mine killing steed dismounts and still hurts hero`
- `dismount object list consumes pending land mine trap`
- `attached ball fallback relocation triggers land mine on new hero square`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "hero land mine|dismount object list consumes pending land mine|attached ball fallback relocation triggers land mine" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Full `blow_up_landmine()` fallout remains partial: scatter, engraving deletion, wakeups, doors/drawbridges, liquid fill, `maybe_dunk_boulders()`, `recalc_block_point()`, and `spot_checks()` are outside this slice; air/water deletion is covered by `668-hero-landmine-air-water-level-deletion-2026-06-07.md`, and same-square boulder fill is covered by `669-hero-landmine-boulder-pit-fill-2026-06-07.md`.
- Landmine lifesaving continuation through the converted pit is covered by `667-hero-landmine-lifesaving-pit-continuation-2026-06-07.md`; exact broader `savelife()` HP formula parity remains there as a follow-up.
- Landmine air/water-level trap deletion is covered by `668-hero-landmine-air-water-level-deletion-2026-06-07.md`.
- Flying `#sit` air-current entry is covered by `666-hero-landmine-sit-air-current-2026-06-07.md`; force/plunge landmine entry remains separate from this recursive pit movement slice.
