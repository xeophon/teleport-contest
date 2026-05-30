# C Parity Audit 210: Lateral Wand-Polymorph Pile Ray

## Sources

- `nethack-c/upstream/src/zap.c:3430-3451`: lateral immediate wand/spell effects call `bhit(u.dx, u.dy, rn1(8, 6), ZAPPED_WAND, bhitm, bhito, &obj)`.
- `nethack-c/upstream/src/zap.c:3870-3878`: `bhit()` advances one square per loop and spends one range unit before processing that square.
- `nethack-c/upstream/src/zap.c:3994-4047`: monster callbacks run before floor piles; if a polymorph monster hit continues, the ray loses three extra range units and still checks the pile on that square.
- `nethack-c/upstream/src/zap.c:2428-2505`: `bhitpile()` returns whether any object in a square's pile was affected; `bhit()` charges at most one extra range unit per affected pile square.
- `nethack-c/upstream/src/zap.c:2119-2221`: `bhito()` returns no effect for unpolyable objects and nonzero for shuddered or replaced polymorph targets.

## JS Changes

- Split floor-pile polymorph mutation into `polymorphFloorPileResultAt()` so multi-square rays can process piles without re-consuming exercise/range RNG or clearing messages on empty cells.
- Added `polymorphFloorPileRay()` for lateral wand polymorph, using `rn1(8, 6)` range and C's one-extra-range-unit cost for affected pile squares.
- Kept vertical handling separate: downward still targets the hero-square pile, and upward still uses the existing no-pile behavior until hiding-under parity is modeled.
- Preserved shop-billing and shudder behavior by reusing the existing per-pile mutation path.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- A lateral polymorph zap reaches a nonadjacent floor pile instead of only the adjacent square.
- An affected pile consumes one extra range unit, leaving a just-beyond-range later pile untouched.

## Remaining Gaps

- Monster polymorph itself is not implemented for this ray yet. The ray accounts for C's monster range penalty so floor-pile reach matches `bhit()`, but monster-first mutation and dropped-inventory bypass behavior remain separate work.
- Spell polymorph is not routed through this floor-pile ray path yet.
- Upward hiding-under pile selection and boulder restacking after polymorph remain separate object-polymorph rows.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "^lateral floor polymorph" test/shop-billing-helpers.test.mjs` (`2` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1083/1083`)
- `node --test test/*.mjs` (`1180/1180`)
- `npm run score` (`44/44`, including `seed0398-wizard-wandpoly-pile.session.json` at `RNG 3026/3026`, `Screen 87/87`)
- `git diff --check`
