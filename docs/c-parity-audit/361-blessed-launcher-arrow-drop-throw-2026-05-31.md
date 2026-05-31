# C Parity Audit 361: Blessed Launcher Arrow Drop-Throw

Date: 2026-05-31

## Summary

Routed clean blessed `+0` monster-fired launcher arrows through the shared monster-thrown `drop_throw` landing path. This matches C for the covered subset: blessed status changes the hit-only missile mulch survival roll, but it does not exclude the projectile from `drop_throw()`.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:622`: cursed and greased missiles use the separate pre-flight misfire branch; blessed missiles do not.
- `nethack-c/upstream/src/mthrowu.c:787`: nonlethal hero hits call `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/mthrowu.c:798`: misses and end-of-path landings call `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:170`: `drop_throw()` only checks missile mulch when `ohit` is true, then otherwise places the object, runs passive object effects, and stacks.
- `nethack-c/upstream/src/dothrow.c:1990`: monster-moving blessed missiles get the extra `!rn2(3)` survival roll inside `should_mulch_missile()`.

## JS changes

- `js/allmain.js`
  - Split the launcher-arrow eligibility check into clean-arrow state and enchantment/BUC state.
  - Allowed clean blessed `+0` arrows into `_arrow_drop_throw_after_topline_more`.
  - Kept blessed `+1/+2`, cursed, greased, eroded, and lethal arrow cases outside this slice.
- `js/cmd.js`
  - Reused the existing `shouldMulchMonsterThrownMissile()` and `landMonsterThrownObject()` path; no command-side behavior changes were needed.

## Tests

- `production monster blessed launcher arrow hit lands surviving arrow with blessed mulch roll` covers a nonlethal hit where the normal `rn2(3)` mulch roll would break, the blessed `rn2(3)` roll saves the arrow, and the blessed arrow lands on the hero square.
- `production monster blessed launcher arrow hit can mulch after blessed survival fails` covers a nonlethal hit where both `rn2(3)` rolls fail to save the arrow and deletion-resistance `rn2(100)` is consumed.
- `production monster blessed launcher arrow miss lands without ohit mulch` covers miss persistence and verifies that `ohit=false` skips both missile mulch `rn2(3)` calls and deletion-resistance `rn2(100)`.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="launcher arrow" test/shop-billing-helpers.test.mjs` - 13 pass, 1477 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1490 pass
- `node --test test/*.mjs` - 1632 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Blessed enchanted launcher arrows still need separate persistence coverage.
- Cursed and greased launcher arrows still need the C pre-flight `!rn2(7)` misfire branch.
- Eroded launcher arrows still need a dedicated damage and persistence audit.
- Lethal launcher-arrow hits remain separate because they can perturb public replay/bones ordering.
- C's full miss flight beyond the hero square remains outside the current simplified production launcher-arrow path.
