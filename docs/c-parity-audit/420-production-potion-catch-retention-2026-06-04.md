# Production Potion Catch Retention

Date: 2026-06-04

## Summary

Monster-thrown offensive potions now split or extract a one-unit thrown potion before flight and pass that singleton through the generic hero catch-retention helper. Successful catches add or merge the potion into inventory, or drop it at the hero square with the catch-but-drop message when inventory letters are full, instead of consuming the potion after only printing catch text.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/muse.c:1522` through `:1547`: offensive potion candidates include paralysis, blindness, confusion, sleeping, and acid.
- `nethack-c/upstream/src/muse.c:2005` through `:2022`: the monster optionally emits the hurl message and calls `m_throw()` with the selected potion.
- `nethack-c/upstream/src/mthrowu.c:593` through `:613`: `m_throw()` extracts a singleton object or splits one object from a stack before flight.
- `nethack-c/upstream/src/mthrowu.c:687` through `:700`: when the flight reaches the hero, generic `u_catch_thrown_obj(singleobj)` runs before potion-specific `potionhit()` crash and vapor handling.
- `nethack-c/upstream/src/mthrowu.c:531` through `:546`: generic catch applies status, hands, free-hand, capacity, and `rn2(catch_chance)` gates, then calls `hold_another_object()`.
- `nethack-c/upstream/src/potion.c:1623` through `:1641` and `:1927`: uncaught potion hits are used up after crash damage and potion effect processing.

## JS Changes

- `js/allmain.js`
  - Replaces offensive potion inline stack decrement/removal with `splitMonsterThrownInventoryObject()`.
  - Uses the split/extracted `thrownPotion` for transient flight display, catch checks, retained object metadata, and uncaught crash/vapor state.
  - Replaces the local catch-only predicate with `heroCanAttemptThrownObjectCatch(thrownPotion)`.
  - Calls `holdCaughtThrownObject(thrownPotion, { catchName: 'potion', glyph: '!' })` on catch success to match the C generic catch message while preserving potion metadata for inventory or floor drop.
  - Clears the visible transient potion projectile on catch so successful catches do not leave a stale display object.
- `test/shop-billing-helpers.test.mjs`
  - Adds a focused monster offensive potion catch harness.
  - Covers split-stack inventory retention, split-stack full-inventory catch/drop, and singleton active missile cleanup.

## Tests

- `production monster potion catch retains split potion in inventory`
- `production monster potion catch drops split potion when inventory letters are full`
- `production monster potion singleton catch clears monster missile`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "production monster potion" test/shop-billing-helpers.test.mjs` - 3 pass, 1635 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1638 pass
- `node --test test/*.test.mjs` - 1789 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The unicorn real/glass gem pre-catch branch remains separate from generic catch retention.
- Broader flint/gray-stone naming and unknown-object discovery parity remains separate from generic catch retention.
- Other potion collision paths outside deliberate monster `m_throw()` offensive potions remain separate if future audits find C catch or use-up ordering gaps there.
