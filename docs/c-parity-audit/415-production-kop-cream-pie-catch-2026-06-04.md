# Production Kop Cream Pie Catch

Date: 2026-06-04

## Summary

Monster-thrown Kop cream pies now use the upstream hero catch gate before hit resolution. A caught pie is retained in inventory with normal merge and inventory-line behavior, or dropped at the hero square with the C catch-but-drop wording when no inventory letter is available. Catching prevents the cream-pie `thitu()` hit, creaming blindness, and splat/break handling.

No replay, seed, map, player-name, move-count, or trace-conditioned behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:593` through `:613`: `m_throw()` extracts a singleton object or splits one object from a stack before flight.
- `nethack-c/upstream/src/mthrowu.c:687` through `:695`: when the missile reaches the hero, `m_throw()` checks `u_catch_thrown_obj(singleobj)` before potion handling and before `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:531` through `:545`: `u_catch_thrown_obj()` computes `100 - ACURR(A_DEX)`, applies the Monk/Rogue bonus, blocks Blind/Confusion/Stunned/Fumbling/venom/no-hands/no-free-hand/too-heavy cases, then succeeds on `!rn2(catch_chance)`.
- `nethack-c/upstream/include/hack.h:456`: `SLT_ENCUMBER` is the burdened threshold used by the catch capacity check.
- `nethack-c/upstream/include/objects.h:1100`: cream pie is a `FOOD_CLASS` object; the catch predicate excludes venom, not food.
- `nethack-c/upstream/src/mthrowu.c:542` through `:545`: successful catch passes `"You catch the %s!"` and `"You catch, but drop, the %s."` to `hold_another_object()`.
- `nethack-c/upstream/src/invent.c:1208` through `:1298`: `hold_another_object()` adds to inventory, merges where possible, drops when inventory slots or encumbrance prevent retention, and updates inventory on success.
- `nethack-c/upstream/src/mthrowu.c:714` through `:764`: uncaught cream pies use `thitu(8, 0, ...)` and only then apply cream-pie blindness messaging.
- `nethack-c/upstream/src/mthrowu.c:836` through `:839`: `drop_throw()` runs after hit/miss handling and destroys cream pies; catching breaks before this path.

## JS Changes

- `js/cmd.js`
  - Adds `heroCanAttemptThrownObjectCatch()` for the upstream deterministic catch gate, including status, venom, no-hands, free-hand, and burdened-or-better capacity checks.
  - Adds `holdCaughtThrownObject()` to merge a caught object into inventory, add it with a new inventory letter, or drop it at the hero square with catch-but-drop wording when all inventory letters are occupied.
- `js/allmain.js`
  - Calls the catch gate in the production Kop cream-pie branch after terrain collision checks and before `rnd(20)` hit resolution.
  - On catch, routes the C catch/catch-but-drop message through the existing visible-thrower after-more pattern and skips hit, blinding, and splat handling.
- `test/shop-billing-helpers.test.mjs`
  - Extends the Kop cream-pie harness with explicit catch-status, DEX, initial-inventory, and full-inventory controls.
  - Adds coverage for inventory insertion, merging into carried cream pies, and full-inventory catch-but-drop.
  - Keeps the hit/blinding test explicitly catch-blocked so it remains a hit-resolution regression.

## Tests

- `production hostile Kop throws cream pie and creams hero on hit`
- `production Kop cream pie catch adds the thrown pie to inventory`
- `production Kop cream pie catch merges with carried cream pies`
- `production Kop cream pie catch drops the pie when inventory letters are full`
- `production Kop cream pie stack splits one thrown pie`
- `production Kop cream pie blindfold blocks hero creaming`
- `production Kop cream pie miss breaks without blinding hero`

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "Kop cream pie|hostile Kop throws cream pie" test/shop-billing-helpers.test.mjs` - 7 pass, 1618 skipped
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` - 1625 pass
- `node --test test/*.test.mjs` - 1776 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The older sling, launcher, spear, shuriken, dagger, potion, crude-dagger, and knife catch branches still mostly message and suppress landing without adding the caught object to inventory. This slice intentionally wires the new hold/capacity helper only to the Kop cream-pie path.
- Broader `hits_bars()` food/object-class behavior remains separate from this catch slice.
