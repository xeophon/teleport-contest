# Production Crude Dagger Catch Retention

Date: 2026-06-04

## Summary

Monster-thrown crude/orcish dagger catches now retain the caught dagger instead of only printing the catch message and suppressing landing. The branch uses the shared upstream catch gate and caught-object inventory helper introduced for Kop cream pies, so a caught dagger enters inventory with normal line/letter handling or follows catch-but-drop behavior when retention is impossible.

No replay, seed, map, player-name, move-count, or trace-conditioned behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/include/objects.h:206` through `:208`: `ORCISH_DAGGER` is displayed as a crude dagger and belongs to the dagger weapon skill class.
- `nethack-c/upstream/src/weapon.c:501`: `ORCISH_DAGGER` participates in monster ranged weapon selection.
- `nethack-c/upstream/src/mthrowu.c:593` through `:613`: `m_throw()` extracts a singleton object or splits one object from a stack before flight.
- `nethack-c/upstream/src/mthrowu.c:687` through `:695`: when the missile reaches the hero, non-tethered thrown objects call `u_catch_thrown_obj(singleobj)` before potion handling and before `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:531` through `:545`: `u_catch_thrown_obj()` applies the status, venom, hands, free-hand, and capacity gates before `rn2(catch_chance)`, then calls `hold_another_object()`.
- `nethack-c/upstream/src/invent.c:1208` through `:1298`: `hold_another_object()` adds the caught object to inventory, merges where possible, or drops it with the catch-but-drop message when it cannot be retained.

## JS Changes

- `js/allmain.js`
  - Replaces the crude dagger branch's local Blind/Confusion/Stunned/Fumbling catch predicate with `heroCanAttemptThrownObjectCatch()`.
  - Calls `holdCaughtThrownObject()` on successful catch with the crude dagger display name.
  - Preserves the existing `crudeDaggerCaught` transient-projectile cleanup and no-landing path.
- `test/shop-billing-helpers.test.mjs`
  - Extends the production crude dagger catch test to assert that the caught orcish dagger enters inventory with quantity 1 and a real inventory letter.

## Tests

- `production monster crude dagger catch does not queue drop-throw landing`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "crude dagger catch" test/shop-billing-helpers.test.mjs` - 1 pass, 1624 skipped
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` - 1625 pass
- `node --test test/*.test.mjs` - 1776 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Other monster-thrown catch branches still need object retention wired in: sling ammo, launcher ammo, spear, shuriken, plain dagger, potion, and knife.
- Most remaining branches must first pass a one-unit thrown object into `holdCaughtThrownObject()`; passing a stack after decrement would catch the residual stack quantity instead of the single projectile.
- Launcher ammo is the smallest next slice because it already has a one-unit `thrownMissile` and transient cleanup around the catch point.
- Full-inventory/drop-path coverage for crude daggers is not yet separate; the production branch now shares the helper covered by Kop cream-pie catch tests.
