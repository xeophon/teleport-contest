# Unicorn Slung Gem Catch

Date: 2026-06-04

## Summary

Monster-slung real and glass gems now take the C unicorn pre-catch branch before the generic thrown-object catch roll when the hero is polymorphed into a unicorn-like form. Real gems are accepted as the monster's gift and routed through inventory retention/drop handling; worthless glass is caught, marked known, and dropped on the hero square. Rocks and gray stones continue through the existing generic catch or hit path.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:504` through `:528`: `ucatchgem()` catches real and glass gems for a unicorn-form hero, drops worthless glass, and routes real gems through `hold_another_object()`.
- `nethack-c/upstream/src/mthrowu.c:687` through `:700`: hero-square missile flight checks `GEM_CLASS && ucatchgem()` before generic `u_catch_thrown_obj()` and potion handling.
- `nethack-c/upstream/src/mthrowu.c:531` through `:546`: generic catch has blindness, confusion, stun, fumbling, venom, hands, free-hand, capacity, and RNG gates that the unicorn gem branch does not use.
- `nethack-c/upstream/include/objects.h:1526` through `:1598`: real gems precede worthless glass, and gray stones are after glass, so luckstones, loadstones, touchstones, flint, and rocks are excluded from `ucatchgem()`.
- `nethack-c/upstream/include/mondata.h:149`: `is_unicorn(ptr)` requires the unicorn monster class and `likes_gems()`.

## JS Changes

- `js/allmain.js`
  - Adds explicit real-gem, glass-gem, gray-stone, and excluded-otyp classifiers for the monster-sling path.
  - Adds unicorn-form detection from the current polyself form, accepting both symbolic `mlet: 'unicorn'` and raw `mlet: 'u'` with gem-liking metadata.
  - Handles the split slung missile after terrain stops and before `heroCanAttemptThrownObjectCatch()` can consume generic catch RNG.
  - Routes real gems through `holdCaughtThrownObject()` with C-shaped gift and catch/drop messaging.
  - Routes worthless glass through floor landing on the hero square after marking the gem known.
- `test/shop-billing-helpers.test.mjs`
  - Extends the sling harness with optional hero polyself metadata.
  - Covers real-gem unicorn pre-catch, glass-gem catch/drop, and a loadstone canary that still uses generic catch.

## Tests

- `production unicorn polyself accepts slung real gem before generic catch`
- `production unicorn polyself catches and drops slung glass gem before generic catch`
- `production unicorn polyself slung loadstone still uses generic catch`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "production (monster sling ruby catch|unicorn polyself|monster sling loadstone catch)" test/shop-billing-helpers.test.mjs` - 5 pass, 1636 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1641 pass
- `node --test test/*.test.mjs` - 1792 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broader non-sling monster-thrown gem paths remain separate if a future audit identifies production paths that can launch real/glass gems without a sling.
- Broader unknown-gem appearance discovery parity remains separate; this slice records glass discovery only for the caught worthless-glass branch.
- Other generic catch-retention paths and potion/object-hit follow-ups remain covered by their own projectile audits.
