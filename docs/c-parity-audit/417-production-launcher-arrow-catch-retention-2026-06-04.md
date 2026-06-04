# Production Launcher Arrow Catch Retention

Date: 2026-06-04

## Summary

Monster-fired launcher ammo catches now retain the caught projectile instead of only printing the catch message. The launcher branch already split stacked ammo into a one-unit `thrownMissile`; successful catches now pass that projectile through the shared C-shaped catch gate and inventory/drop helper.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/weapon.c:498` through `:502`: monster ranged weapon selection includes YA, arrows, orcish arrows, crossbow bolts, and other ranged missiles.
- `nethack-c/upstream/src/mthrowu.c:1191` through `:1262`: `thrwmq()` selects the ranged object and routes launcher shots through `monshoot()`.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: `monshoot()` fires each missile by calling `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:593` through `:613`: `m_throw()` extracts a singleton object or splits one object from a stack before flight.
- `nethack-c/upstream/src/mthrowu.c:687` through `:695`: when the missile reaches the hero, non-tethered thrown objects call `u_catch_thrown_obj(singleobj)` before potion handling and before `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:531` through `:545`: `u_catch_thrown_obj()` applies the status, venom, hands, free-hand, and capacity gates before `rn2(catch_chance)`, then calls `hold_another_object()`.
- `nethack-c/upstream/src/invent.c:1208` through `:1298`: `hold_another_object()` adds the caught object to inventory, merges where possible, or drops it with the catch-but-drop message when it cannot be retained.

## JS Changes

- `js/allmain.js`
  - Replaces the launcher ammo branch's local Blind/Confusion/Stunned/Fumbling catch predicate with `heroCanAttemptThrownObjectCatch(thrownMissile)`.
  - Calls `holdCaughtThrownObject(thrownMissile)` on catch success using the projectile display name.
  - Preserves the existing transient projectile cleanup and avoids hit, miss, mulch, and drop-throw scheduling on catch success.
- `test/shop-billing-helpers.test.mjs`
  - Adds a production launcher-arrow catch regression using a two-arrow stack and normal DEX, proving the split one-unit projectile enters inventory while the monster retains the residual stack.

## Tests

- `production monster launcher arrow catch retains split arrow in inventory`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "launcher arrow catch" test/shop-billing-helpers.test.mjs` - 1 pass, 1625 skipped
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` - 1626 pass
- `node --test test/*.test.mjs` - 1777 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Other monster-thrown catch branches still need object retention wired in: sling ammo, spear, shuriken, plain dagger, potion, and knife.
- Most remaining branches must first pass a one-unit thrown object into `holdCaughtThrownObject()`; passing a residual stack directly would catch too many objects.
- Launcher full-inventory/drop-path coverage is not yet separate; the production branch now shares the helper covered by Kop cream-pie catch tests.
