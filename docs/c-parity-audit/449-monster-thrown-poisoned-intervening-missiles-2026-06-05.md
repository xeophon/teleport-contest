# Monster Thrown Poisoned Intervening Missiles

Date: 2026-06-05

## Summary

Monster-thrown poisoned shuriken and darts now apply the C `ohitmon()` poison side effect when they hit an intervening monster. The implementation keeps C ordering: base/blessed/silver damage is rolled first, mimic reveal and wakeup happen before the hit line, hit punctuation uses pre-poison damage, poison resistance skips extra RNG and prints only when visible, non-resistant poison rolls `rn2(30)` then either adds `rnd(6)` or replaces damage with target HP, silver text follows poison text, and HP subtraction/drop happens last. The change is state-driven and does not depend on replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:373` through `:416`: non-potion intervening hits compute `dmgval()`, reveal mimics, wake the target, print hit text, then apply poisoned weapon side effects.
- `nethack-c/upstream/src/mthrowu.c:403` through `:416`: poison is gated by `otmp->opoisoned && is_poisonable(otmp)`; poison-resistant monsters get a visible-only message and no `rn2(30)` roll, non-resistant monsters roll `rn2(30)`, and the zero branch is deadly.
- `nethack-c/upstream/include/obj.h:264` through `:268`: `is_poisonable()` covers weapon-class objects whose skill is between `-P_SHURIKEN` and `-P_BOW`, plus permanently poisoned artifacts.
- `nethack-c/upstream/include/objects.h`: darts use `-P_DART` and shuriken use `-P_SHURIKEN`; ordinary spears, daggers, and knives use positive weapon skills and are not poisonable by this predicate.
- `nethack-c/upstream/src/mthrowu.c:418` through `:451`: silver side text and HP subtraction occur after poison handling, while silver damage is already part of `dmgval()`.
- `nethack-c/upstream/src/mthrowu.c:491` and `nethack-c/upstream/src/dothrow.c:1974`: surviving thrown objects are dropped after hit handling without clearing `opoisoned`.

## JS Changes

- `js/allmain.js`
  - Adds `monsterThrownObjectIsPoisonable()` and shares it with the existing launcher projectile predicate, including an `otyp === DART` guard for name-light generated darts.
  - Adds shared poison effect/message helpers for monster-thrown object hits.
  - Wires poison into the shuriken and dart intervening-monster branches only, preserving C exclusion for poisoned spears, daggers, and knives.
  - Moves shuriken/dart HP subtraction after hit text, poison, and silver message emission so hit punctuation remains based on pre-poison damage.
- `test/shop-billing-helpers.test.mjs`
  - Allows the dart monster-throw harness to inject a specific projectile/inventory.
  - Adds poisoned shuriken and poisoned dart intervening-hit damage coverage against non-resistant monsters.
  - Adds a poison-resistant dart target coverage row that verifies the visible resistance message and no `rn2(30)` poison roll.
  - Adds a poisoned dagger canary showing non-poisonable thrown weapons keep `opoisoned` on the object but do not trigger poison side effects.

## Tests

- `production monster poisoned thrown missiles damage non-resistant intervening monsters`
- `production monster poisoned dart intervening hit respects monster poison resistance`
- `production monster poisoned dagger intervening hit does not use thrown-missile poison`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "poisoned thrown missiles|poisoned dart intervening|poisoned dagger intervening" test/shop-billing-helpers.test.mjs` - 3 pass, 1691 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1694 pass
- `node --test test/*.mjs` - 1845 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Acid venom, eggs, blinding venom, and cream-pie post-hit effects remain separate `ohitmon()` slices.
- Full monster death cleanup for non-launcher thrown intervening hits remains narrower than `xkilled()`/`mondied()` and should stay source-backed.
- Poisoned sling-skill objects are not wired because the existing monster-sling runtime does not currently generate poisoned sling ammo fixtures; add only if a source-backed production object path needs it.
