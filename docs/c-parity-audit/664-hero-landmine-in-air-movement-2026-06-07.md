# 664 - Hero Landmine In-Air Movement

## C Source

- `nethack-c/upstream/src/hack.c:2979` runs `spoteffects(TRUE)` after ordinary hero movement.
- `nethack-c/upstream/src/hack.c:3391` routes traps on the hero square through `dotrap()`.
- `nethack-c/upstream/src/ball.c:891-958` can relocate the hero after an attached-ball throw, then invokes the same `spoteffects(TRUE)` path when the hero square changes.
- `nethack-c/upstream/src/trap.c:1061-1088` classifies `LANDMINE` as a floor-trigger trap and treats hero levitation/flying as in-air state for ordinary trap entry.
- `nethack-c/upstream/src/trap.c:3025-3032` skips in-air floor-trigger traps before trap-specific effects. Hidden traps are silent; already-seen traps say that the hero floats or flies over the trap.
- `nethack-c/upstream/src/trap.c:3035-3039` applies the normal known-trap `rn2(5)` escape prelude only after the in-air floor-trigger skip did not return.
- `nethack-c/upstream/src/trap.c:2528-2595` contains the hero landmine explosion and air-current branch, but ordinary in-air movement does not reach it because `dotrap()` returns earlier.

## Port Notes

- `movementLandmineResult()` now uses the shared `movementFloorTriggerPrecheck()` before calling the landmine-specific helper.
- Ordinary movement, attached-ball fallback relocation, and deferred object-list movement share this entry point, so flying/levitating landmine movement now follows C's generic floor-trigger ordering.
- The existing landmine air-current helper remains in place for source-backed follow-up work around sitting, plunge, and force cases.

## Tests

- `flying hero crosses hidden land mine without trigger RNG`
- `flying hero crosses known land mine with over-floor message`
- `flying attached ball fallback over hidden land mine skips floor trigger`
- Existing ground canaries still cover ordinary and attached-ball landmine detonation:
  - `hero land mine movement explodes into pit and wounds hero`
  - `attached ball fallback relocation triggers land mine on new hero square`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "land mine|landmine|flying attached ball fallback over hidden land mine|attached ball fallback relocation triggers land mine" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Recursive pit fallout after ordinary landmine explosions is covered by `665-hero-landmine-recursive-pit-2026-06-07.md`; broader `blow_up_landmine()` terrain/object fallout remains open there.
- Sitting and force/plunge landmine entry need separate canaries. In C, flying `#sit` reaches `dotrap(..., VIASITTING)`, while force flags bypass the ordinary in-air floor-trigger precheck.
- Object-list deferral has dismount coverage, but a direct multi-object landmine movement canary would make the deferred entry point more explicit.
