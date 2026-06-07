# 678 - Horizontal Throw Recoil Sokoban Pit/Hole Stops

## C Source

- `nethack-c/upstream/src/dothrow.c:937-965` handles traps after each successful recoil `hurtle_step()` move.
- `nethack-c/upstream/src/dothrow.c:955-961` special-cases Sokoban pits and holes: for non-jump recoil it calls `dotrap(ttmp, NO_TRAP_FLAGS)`, sets `*range = 0`, and returns `TRUE`.
- `nethack-c/upstream/src/trap.c:3014-3024` prints the Sokoban air-current message before proceeding to the normal trap effect.
- `nethack-c/upstream/src/trap.c:1849-1852` prevents levitation/flying escape from Sokoban pits and reveals the trap.
- `nethack-c/upstream/src/trap.c:1920-1925` applies pit trapping and pit/spiked-pit damage.
- `nethack-c/upstream/src/trap.c:2013-2025` routes holes/trapdoors through fall-through handling.

## Port Notes

- `heroHorizontalThrowRecoilTrapEffectAt()` now handles Sokoban `is_pit()` and `is_hole()` traps after a successful recoil step.
- Pits and spiked pits route through `movementPitResult()`, preserving the shared Sokoban air-current message, trap reveal, pit trapping, and pit damage behavior.
- Holes and trapdoors route through `movementTransportTrapResult()`, preserving trap reveal, `More`, and deferred fall-through scheduling.
- The recoil loop stops on the trap square after the Sokoban pit/hole effect, matching C's `*range = 0`.
- Generic seen-trap pass-over text still excludes Sokoban pits/holes because C dispatches the real trap effect instead.

## Tests

- `levitating hero-thrown loose heavy iron ball recoil triggers Sokoban pit and stops`
- `levitating hero-thrown loose heavy iron ball recoil falls through Sokoban hole and stops`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "levitating hero-thrown ordinary weapon recoils after C split range flight|levitating hero-thrown ordinary weapon recoil bumps boulder|levitating hero-thrown ordinary weapon recoil bumps monster|levitating hero-thrown ordinary weapon recoil passes over seen anti-magic field|levitating hero-thrown ordinary weapon recoil vibrates hidden vibrating square|levitating hero-thrown ordinary weapon recoil skips hidden fire trap|air-level hero-thrown ordinary weapon recoil triggers hidden fire trap|levitating hero-thrown loose heavy iron ball recoil activates hidden magic portal and stops|levitating hero-thrown loose heavy iron ball recoil triggers Sokoban pit and stops|levitating hero-thrown loose heavy iron ball recoil falls through Sokoban hole and stops|levitating hero-thrown loose heavy iron ball uses C ball range divisor|levitating hero-thrown arrow with matching bow uses C ammo range increment" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- No remaining special `hurtle_step()` recoil trap effects are currently tracked in this micro-area.
- Full normal-movement trap dispatch is still deliberately avoided for recoil because C only triggers a narrow trap subset from `hurtle_step()`.
