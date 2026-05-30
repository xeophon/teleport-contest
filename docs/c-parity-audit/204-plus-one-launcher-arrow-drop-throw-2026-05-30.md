# C Parity Audit 204: Plus-One Launcher Arrow Drop-Throw

## Sources

- `nethack-c/upstream/src/mthrowu.c:593-618`: monster-thrown launcher ammo is split into a single projectile before flight.
- `nethack-c/upstream/src/mthrowu.c:787`: successful hero hits call `drop_throw(singleobj, hitu, u.ux, u.uy)` after `thitu()` effects.
- `nethack-c/upstream/src/mthrowu.c:815`: misses and end-of-flight landings call `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:162-190`: `drop_throw()` only applies missile mulch when `ohit` is true, then runs shipping, floor effects, placement, passive-object effects, and stacking.
- `nethack-c/upstream/src/dothrow.c:1978-1999`: `should_mulch_missile()` uses `chance = 3 + greatest_erosion(obj) - obj->spe`; clean `+1` arrows therefore use the `rn2(2)` break gate.

## JS Changes

- Broadened the production launcher-arrow shared drop-throw path from clean `+0` arrows to clean `+0` or `+1` arrows.
- Kept blessed, cursed, greased, eroded, and lethal launcher-arrow paths on the existing replay-preserving shim.
- Reused the existing `landMonsterThrownObject()` path so nonlethal `+1` hits use the C-shaped `ohit` mulch gate and misses land with `ohit == false`.
- Reused a local `missileSpe` value for launcher-arrow damage and hit calculation to avoid divergent enchantment reads in the branch.

## Tests

Added focused production coverage in `test/shop-billing-helpers.test.mjs`:

- A clean `+1` launcher-arrow hit that survives the `rn2(2)` mulch gate lands on the hero square and preserves `spe: 1`.
- A clean `+1` launcher-arrow hit that fails the `rn2(2)` mulch gate consumes the deletion-resistance `rn2(100)` and leaves no persistent or transient arrow.
- A clean `+1` launcher-arrow miss lands with `ohit == false` and consumes no hit-only mulch RNG.
- A clean `+1` launcher-arrow stack split leaves the residual monster ammo stack at `quan == 2`, gives the fired projectile a fresh id, and lands only the one-shot projectile.

The hit tests distinguish the deferred strength exercise `rn2(2)` from the drop-throw mulch `rn2(2)` by asserting the final two `rn2(2)` rolls.

## Remaining Gaps

- Blessed, cursed, greased, and eroded launcher arrows still use the legacy deferred replay shim.
- Lethal launcher-arrow hits still use the deferred death path without broadening landed object persistence.
- C's full miss flight beyond the hero square remains outside the current simplified production launcher-arrow path.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern 'production monster .*launcher arrow' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`1069/1069`)
- `node --test test/*.mjs` (`1166/1166`)
- `npm run score` (`44/44`, including `seed0030-ten-diverse-deaths.session.json` at `RNG 105529/105529`, `Screen 1953/1953`)
