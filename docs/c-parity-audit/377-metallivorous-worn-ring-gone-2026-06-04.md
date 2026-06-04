# Metallivorous Worn Ring Gone

Date: 2026-06-04

## Summary

Aligned digestible worn metal ring eating with C's `Ring_gone()` ordering. C allows metallivorous heroes to eat worn rings, but `eataccessory()` first removes worn-ring state before taste identification, the eaten-accessory effect roll, and final `useup()`. JS was consuming the ring without first clearing hand metadata, leaving the eaten object marked as worn after a successful or failed effect roll.

## Upstream source anchors

- `nethack-c/upstream/src/eat.c:2265`: `eataccessory()` handles eaten rings and amulets.
- `nethack-c/upstream/src/eat.c:2273` through `:2277`: worn left/right rings call `Ring_gone(otmp)` before taste observation and before the eaten-effect roll.
- `nethack-c/upstream/src/eat.c:2452` through `:2454`: `doeat_nonfood()` routes rings and amulets through `eataccessory()`.
- `nethack-c/upstream/src/eat.c:2482` through `:2485`: carried non-food objects are consumed with `useup()` after accessory handling.
- `nethack-c/upstream/src/eat.c:2911` through `:2916`: ring of slow digestion is indigestible and returns before `doeat_nonfood()`/`eataccessory()`.
- `nethack-c/upstream/src/do_wear.c:1347` through `:1358`: `Ring_off_or_gone()` clears worn state with `setnotworn(obj)` for the gone case.
- `nethack-c/upstream/src/do_wear.c:1455` through `:1458`: `Ring_gone()` wraps `Ring_off_or_gone(obj, TRUE)`.

## JS changes

- `js/cmd.js`
  - Added a narrow `clearEatenWornRingState()` helper for digestible carried ring-like objects.
  - Clears `worn`, known worn-mask metadata fields, and `(on left/right hand)` line suffix before eaten accessory effects and inventory removal.
  - Leaves the slow-digestion indigestible branch untouched, matching C's earlier return.

## Tests

- `metallivorous worn metal ring clears hand state before eaten effect succeeds` covers `Ring_gone()` ordering before a successful eaten-ring effect.
- `metallivorous worn metal ring clears hand state when eaten effect fails` covers the same cleanup when the 1-in-3 eaten-ring effect roll fails.
- `metallivorous worn slow digestion ring stays worn after indigestible effect` covers the C early-return path for `RIN_SLOW_DIGESTION`.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "metallivorous worn metal ring|metallivorous worn slow digestion ring|metallivorous metal ring eating" test/shop-billing-helpers.test.mjs` - 5 pass, 1510 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1515 pass
- `node --test test/*.mjs` - 1657 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- This helper intentionally does not clear broad direct hero booleans such as `fireResistance`; JS lacks C's source-mask tracking, so clearing those broadly could remove an intrinsic from another source.
- Broader eaten-accessory cleanup remains open for fullness, cursed side effects, source-masked extrinsics, and strangulation/life-saving interactions.
