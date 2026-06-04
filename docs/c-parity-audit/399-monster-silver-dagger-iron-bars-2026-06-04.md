# Monster Silver Dagger Iron Bars

Date: 2026-06-04

## Summary

Monster-thrown silver daggers now use the covered production dagger throw branch instead of being skipped by the exact dagger selector. In C, `SILVER_DAGGER` is a `P_DAGGER` silver weapon, so `hits_bars()` stops it at iron bars by weapon class and chooses the silver `Clink!` sound instead of the ordinary dagger `Clonk!` sound. The stopped projectile lands on the thrower-side square with `ohit=false`, preserving the existing no-hit, no-catch, no-mulch terrain-stop behavior.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/include/objects.h:209` through `:211`: `silver dagger` is a stackable silver `P_DAGGER` weapon.
- `nethack-c/upstream/src/weapon.c:498` through `:502`: the monster ranged-weapon table includes `SILVER_DAGGER` before elven, plain, or orcish daggers.
- `nethack-c/upstream/src/weapon.c:612` through `:665`: `select_rwep()` chooses exact ranged objects from the table when no launcher is needed.
- `nethack-c/upstream/src/mthrowu.c:552` through `:566`: iron-bars preflight/flight checks route through `hits_bars()`.
- `nethack-c/upstream/src/mthrowu.c:798` through `:799`: non-adjacent missile flight consumes `forcehit = !rn2(5)` before checking next-square terrain.
- `nethack-c/upstream/src/mthrowu.c:801` through `:816`: stopped missiles use `drop_throw(..., 0, ...)`, so terrain stops do not use hit-only behavior.
- `nethack-c/upstream/src/mthrowu.c:1447` through `:1467`: bar impact sound is `Clink!` for silver material unless the hero is Deaf.
- `nethack-c/upstream/src/mthrowu.c:1512` through `:1520`: weapon-class bars handling excludes bows, crossbows, darts, shuriken, spears, and knives; dagger-skill weapons stop by class.

## JS Changes

- `js/allmain.js`
  - Extends the covered monster plain-dagger selector to include exact `silver dagger` identity via `kind` or `actualKind`, with silver daggers preferred before plain daggers like the C ranged table.
  - Derives the visible throw, catch, miss, and hit wording from the selected dagger object.
  - Uses `Clink!` for silver daggers/materials and keeps `Clonk!` for ordinary daggers, with the existing Deaf suppression.
- `test/shop-billing-helpers.test.mjs`
  - Adds a monster silver dagger fixture.
  - Parameterizes the existing monster plain-dagger iron-bars helper so it can exercise the same production path with silver material.
  - Adds visible-sound, Deaf-silent, and silver-before-plain selector regressions for monster-thrown silver daggers stopped by iron bars.

## Tests

- `production monster silver dagger aimed shot clinks iron bars before hero`
- `production monster silver dagger aimed iron bars are silent when deaf`
- `production monster silver dagger selection precedes plain dagger for iron bars`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern 'monster (plain|silver) dagger' test/shop-billing-helpers.test.mjs` - 5 pass, 1568 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1573 pass
- `node --test test/*.test.mjs` - 1717 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Numeric `SILVER_DAGGER` object ID support remains registry-local; this slice matches the current JS object fixtures by exact object identity text.
- `ELVEN_DAGGER` and `ATHAME` monster-ranged selection remain separate from this focused silver dagger path.
- Broader `hits_bars()` object-class coverage remains open for spear, shuriken, crossbow bolt, remaining arrows, stones/gems, harmless/flimsy objects, boulders/heavy iron balls, armor/tool/food gates, object breakage side effects, wakeup noise, and bar dissolution.
