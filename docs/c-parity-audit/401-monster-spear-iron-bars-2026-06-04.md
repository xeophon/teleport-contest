# Monster Spear Iron Bars

Date: 2026-06-04

## Summary

Monster-thrown spears now participate in the production ranged-weapon path instead of being skipped in favor of later dagger/knife/launcher branches. In C, spear-family weapons are first in `rwep[]`, use hand throwing rather than a launcher, and have `P_SPEAR`; `hits_bars()` lets them pass through iron bars unless the non-adjacent `forcehit = !rn2(5)` flight roll forces a bar hit. Forced bar hits consume object resistance, print ordinary iron `Clonk!` unless the hero is Deaf, skip hero hit/catch handling, and land the surviving spear on the thrower-side square with `ohit=false`.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/include/objects.h:170` through `:191`: spears and javelins share `P_SPEAR`; ordinary spears are iron, weigh 30, and use small-target damage die `6`.
- `nethack-c/upstream/src/weapon.c:498` through `:503`: `rwep[]` ranks spear-family weapons and javelins before arrows, crossbow bolts, daggers, knives, stones, and darts.
- `nethack-c/upstream/src/weapon.c:612` through `:665`: `select_rwep()` chooses ranged weapons and allows positive-skill spear weapons to be thrown by hand.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: `monshoot()` emits `throws` for hand-thrown objects and routes through `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:552` through `:568`: missile preflight/flight checks route iron bars through `hits_bars()`.
- `nethack-c/upstream/src/mthrowu.c:639` through `:641`: adjacent preflight checks pass `always_hit=0`, so `P_SPEAR` can pass through bars.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: non-adjacent missile flight consumes `forcehit = !rn2(5)` before checking next-square terrain, and stopped missiles use `drop_throw(..., 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:1447` through `:1467`: ordinary iron bar impact sound is `Clonk!` unless the hero is Deaf; silver/gold objects use `Clink!`.
- `nethack-c/upstream/src/mthrowu.c:1512` through `:1520`: `P_SPEAR` weapons pass through iron bars unless `always_hit`/`forcehit` is set.

## JS Changes

- `js/allmain.js`
  - Adds C-ordered spear-family ranged selection metadata and small-target damage dice.
  - Selects monster-thrown spears before dagger, knife, dart, and active launcher-ammo branches.
  - Models `P_SPEAR` iron-bars pass-through with forced-hit `rn2(100)`, `Clonk!`/`Clink!` sound selection, Deaf silence, thrower-side landing, d6 ordinary spear damage, hit/miss wording, and erosion/enchantment damage adjustment.
- `js/mklev.js`
  - Gives natural `mongets(SPEAR)` and `mongets(DWARVISH_SPEAR)` inventory the normal weapon glyph/color from `object_display()`.
- `test/shop-billing-helpers.test.mjs`
  - Adds a production spear helper and focused regressions for pass-through, forced `Clonk!`, Deaf silence, hit damage/text, dagger precedence, and active-crossbow precedence.

## Tests

- `production monster spear aimed shot can pass through iron bars before hero`
- `production monster spear hit uses spear damage and text`
- `production monster spear aimed shot can clonk iron bars before hero`
- `production monster spear aimed iron bars are silent when deaf`
- `production monster spear selection precedes dagger for iron bars`
- `production monster spear selection precedes active crossbow bolts`

## Verification

- `node --check js/allmain.js`
- `node --check js/mklev.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern 'production monster spear' test/shop-billing-helpers.test.mjs` - 6 pass, 1577 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1583 pass
- `node --test test/*.test.mjs` - 1727 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Javelin and non-ordinary spear variants are selected by C-shaped kind metadata but still need natural production generation/object-registry coverage before they should be claimed as fully covered.
- Broader `hits_bars()` object-class coverage remains open for remaining arrows, stones/gems, harmless/flimsy objects, boulders/heavy iron balls, armor/tool/food gates, object breakage side effects, wakeup noise, and bar dissolution.
