# 674 - Horizontal Throw Recoil Seen Trap Pass-Over

## C Source

- `nethack-c/upstream/src/dothrow.c:1650-1680` applies ordinary horizontal throw recoil after projectile flight.
- `nethack-c/upstream/src/dothrow.c:937-965` handles traps after each successful `hurtle_step()` move.
- C fires only a narrow set of recoil trap effects: magic portals, vibrating squares, fire traps, and Sokoban pit/hole stops. Other traps do not trigger during recoil; if already seen, C prints `You pass right over %s.` with `an(trapname(ttyp, FALSE))`.
- `nethack-c/upstream/include/defsym.h:158` and `nethack-c/upstream/include/defsym.h:177` provide display names such as `dart trap` and `anti-magic field`.

## Port Notes

- `heroHorizontalThrowRecoil()` now accumulates messages across successful recoil steps, so C-style trap pass-over text can appear before any later stop or collision message.
- Seen non-special recoil traps now add `You pass right over <a/an trap>.` using the existing `TRAP_NAMES` and article helper.
- Hidden traps remain silent and unrevealed.
- The implementation intentionally excludes C's special trap branches from this generic pass-over path: magic portal, vibrating square, fire trap, and Sokoban pit/hole handling.

## Tests

- `levitating hero-thrown ordinary weapon recoil passes over seen anti-magic field`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "levitating hero-thrown ordinary weapon recoils after C split range flight|levitating hero-thrown ordinary weapon recoil bumps boulder|levitating hero-thrown ordinary weapon recoil bumps monster|levitating hero-thrown ordinary weapon recoil passes over seen anti-magic field|levitating hero-thrown loose heavy iron ball uses C ball range divisor|levitating hero-thrown arrow with matching bow uses C ammo range increment" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Actual recoil trap effects for magic portals, fire traps, and Sokoban pit/hole stops remain separate slices.
- Full normal-movement trap dispatch is still deliberately avoided for recoil because C does not trigger most floor traps from `hurtle_step()`.
