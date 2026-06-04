# Production Sling Ammo Catch Retention

Date: 2026-06-04

## Summary

Monster-slung rocks, gems, and gray stones now use the same one-object split/extract and catch-retention path as the other retained monster projectiles. Successful generic catches add or merge the caught ammo into inventory, or drop it with the catch-but-drop message when inventory letters are full, instead of consuming the ammo after only printing catch text.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/weapon.c:498` through `:502`: monster ranged selection ranks `FLINT`, `ROCK`, `LOADSTONE`, and `LUCKSTONE` after knives and before darts.
- `nethack-c/upstream/src/weapon.c:615` through `:623`: arbitrary carried `GEM_CLASS` sling ammo is selected just before darts when the monster has a sling, does not like gems, and the candidate is not a cursed loadstone.
- `nethack-c/upstream/src/weapon.c:630` through `:643`: `P_SLING` ammo requires a carried sling as propellor.
- `nethack-c/upstream/src/mthrowu.c:593` through `:613`: `m_throw()` extracts a singleton object or splits one object from a stack before flight.
- `nethack-c/upstream/src/mthrowu.c:691` through `:695`: at the hero square, `ucatchgem()` runs first for `GEM_CLASS`, then generic `u_catch_thrown_obj(singleobj)` runs before hit handling.
- `nethack-c/upstream/src/mthrowu.c:504` through `:528`: the unicorn gem branch only handles real/glass gems for unicorn polyself; rocks and gray stones fall through to generic catch.
- `nethack-c/upstream/src/mthrowu.c:531` through `:546`: generic catch applies the status, hands, free-hand, capacity, and `rn2(catch_chance)` gates, then calls `hold_another_object()`.
- `nethack-c/upstream/src/mthrowu.c:704`, `:787`, and `:798` through `:816`: uncaught projectiles proceed to ordinary hit/miss and `drop_throw()` landing.

## JS Changes

- `js/allmain.js`
  - Replaces inline sling ammo decrement/removal with `splitMonsterThrownInventoryObject()`.
  - Passes the one-unit `thrownMissile` to terrain stops, catch retention, damage, and hit/miss landing.
  - Replaces the local catch-only predicate with `heroCanAttemptThrownObjectCatch(thrownMissile)`.
  - Calls `holdCaughtThrownObject(thrownMissile)` on generic catch success with the sling ammo display name, gem glyph, and ammo color.
- `test/shop-billing-helpers.test.mjs`
  - Adds `heroDex`, `initialInventory`, and `fullInventory` controls to the existing sling harness.
  - Adds split-stack catch regressions for rock, ruby, and uncursed loadstone ammo.
  - Adds full-inventory catch-but-drop coverage for a split slung rock.

## Tests

- `production monster sling rock catch retains split rock in inventory`
- `production monster sling ruby catch retains split gem in inventory`
- `production monster sling loadstone catch retains split gray stone in inventory`
- `production monster sling catch drops split rock when inventory letters are full`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "sling .*catch" test/shop-billing-helpers.test.mjs` - 4 pass, 1631 skipped
- `node --test --test-name-pattern "production monster sling" test/shop-billing-helpers.test.mjs` - 15 pass, 1620 skipped
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` - 1635 pass
- `node --test test/*.test.mjs` - 1786 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The unicorn real/glass gem pre-catch branch remains separate from this generic sling ammo catch-retention slice.
- Monster-thrown potions still need object retention wired through the shared catch helper.
- Broader flint/gray-stone naming and unknown-object discovery parity remains separate from generic catch retention.
