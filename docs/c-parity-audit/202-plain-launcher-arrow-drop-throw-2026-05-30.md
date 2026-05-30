# C Parity Audit 202: Plain Launcher Arrow Drop-Throw Landing

## Sources

- `nethack-c/upstream/src/mthrowu.c:262-300`: launcher ammo uses the normal monster shooting path and calls `m_throw()` for each fired projectile.
- `nethack-c/upstream/src/mthrowu.c:593-618`: `m_throw()` extracts a single projectile from monster inventory before flight, splitting stacks when needed.
- `nethack-c/upstream/src/mthrowu.c:695-789`: caught projectiles stop without landing; hero hits call `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/mthrowu.c:798-815`: hero misses continue to the end-of-flight/blockage path and call `drop_throw(..., 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:162-190`: `drop_throw()` uses `ohit` for hit-only missile mulch and passive-object effects.
- `nethack-c/upstream/src/dothrow.c:1978-1999`: `should_mulch_missile()` gates breakage by ammo/missile type, enchantment, blessing, erosion, and magic-object status.

## JS Changes

- The production launcher-arrow branch now creates a real one-shot projectile object before mutating the monster's ammo stack, using a fresh `next_ident()` for split stacks.
- Plain +0, non-BUC/greased/eroded launcher arrows now defer to `landMonsterThrownObject()` after the hit/miss message, with `ohit: true` for nonlethal hits and `ohit: false` for misses.
- The old `_arrow_mulch_after_topline_more` replay shim remains for non-plain launcher arrows so the known public blessed/enchanted stack path stays stable until that broader object-state slice is implemented.
- Hit landing is processed after deferred strength exercise so the C `thitu()` then `drop_throw()` RNG order is preserved.

## Tests

Added focused production coverage in `test/shop-billing-helpers.test.mjs`:

- A plain launcher arrow hit that survives the `rn2(3)` mulch check lands on the hero square and is removed from monster inventory.
- A plain launcher arrow hit that mulches consumes the deletion resistance roll and leaves no persistent or transient arrow.
- A plain launcher arrow miss lands without consuming hit-only mulch RNG.

## Remaining Gaps

- Blessed, cursed, greased, eroded, and enchanted launcher arrows still use the legacy deferred mulch shim to preserve public replay/bones state.
- Lethal launcher-arrow hits still use the existing deferred death path without broadening landed object persistence.
- C's full miss flight beyond the hero square is not modeled here; the covered production miss uses the existing simplified hero-square landing.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern 'production monster launcher arrow|production kobold dart hit|production monster sling rock|production monster crude dagger catch|monster-thrown dart hit can mulch|monster-thrown dart hit survives|monster-thrown dart miss' test/shop-billing-helpers.test.mjs`
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` (`RNG 105529/105529`, `Screen 1953/1953`)
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44`)
