# Monster Shuriken Iron Bars

Date: 2026-06-04

## Summary

Monster-carried shuriken with explicit object name metadata now participate in the production monster ranged-weapon path. In C, `SHURIKEN` is a launcherless iron `-P_SHURIKEN` missile, ranked after spear-family weapons and before arrows, crossbow bolts, daggers, knives, stones, and darts. `hits_bars()` lets shuriken pass through iron bars unless the non-adjacent `forcehit = !rn2(5)` flight roll forces a bar hit; forced bar hits consume object resistance, print ordinary iron `Clonk!` unless the hero is Deaf, skip hero hit/catch handling, and land the surviving shuriken on the thrower-side square with `ohit=false`.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/include/objects.h:159` through `:165`: shuriken are launcherless iron missiles, appear unidentified as `throwing star`, use small-target damage die `8`, have to-hit bonus `2`, and use skill `-P_SHURIKEN`.
- `nethack-c/upstream/src/weapon.c:498` through `:503`: `rwep[]` ranks `SHURIKEN` after spear-family weapons and before arrows, crossbow bolts, daggers, knives, stones, and darts.
- `nethack-c/upstream/src/weapon.c:612` through `:665`: `select_rwep()` chooses ranged weapons and uses `hands_obj` for `-P_SHURIKEN` because it is not bow, sling, or crossbow launcher ammo.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: `monshoot()` emits `throws <article> <object>` for hand-thrown missiles and routes each shot through `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:552` through `:568`: missile preflight/flight checks route iron bars through `hits_bars()`.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: hero hit damage uses `dmgval()`, range-adjusted hit value, enchantment, and a floor of one damage.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: non-adjacent missile flight consumes `forcehit = !rn2(5)` before checking next-square terrain, and stopped missiles use `drop_throw(..., 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:1447` through `:1467`: ordinary iron bar impact sound is `Clonk!` unless the hero is Deaf.
- `nethack-c/upstream/src/mthrowu.c:1512` through `:1520`: `-P_SHURIKEN` weapons pass through iron bars unless `always_hit`/`forcehit` is set.
- `nethack-c/upstream/src/dothrow.c:38` through `:70`: monk and ninja multishot class bonuses recognize `-P_SHURIKEN`; multishot itself remains outside this focused slice.

## JS Changes

- `js/allmain.js`
  - Adds metadata-based shuriken recognition for `shuriken` and unidentified `throwing star` objects.
  - Selects monster-thrown shuriken after spear-family weapons and before dagger, knife, dart, and active launcher-ammo branches.
  - Models shuriken hit/miss text, d8 small-target damage, enchantment and erosion damage adjustment, hit landing/mulch routing, iron-bars pass-through, forced `rn2(100)` object resistance, `Clonk!`/Deaf sound handling, and thrower-side forced-hit landing with `ohit=false`.
  - Suppresses active launcher ammo when a higher-ranked shuriken shot is lined up, matching the C ranged-weapon order.
- `test/shop-billing-helpers.test.mjs`
  - Adds a metadata-bearing shuriken fixture helper without relying on a local `otyp` constant.
  - Adds focused production regressions for hit damage/mulch, iron-bars pass-through, forced iron-bars `Clonk!`, Deaf silence, spear precedence, dagger/knife precedence, and active-crossbow precedence.

## Tests

- `production monster shuriken hit uses shuriken damage and can mulch`
- `production monster shuriken aimed shot can pass through iron bars before hero`
- `production monster shuriken aimed shot can clonk iron bars before hero`
- `production monster shuriken aimed iron bars are silent when deaf`
- `production monster spear selection precedes shuriken`
- `production monster shuriken selection precedes dagger and knife`
- `production monster shuriken selection precedes active crossbow bolts`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern 'production monster shuriken|production monster spear selection precedes shuriken' test/shop-billing-helpers.test.mjs` - 7 pass, 1593 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1600 pass
- `node --test test/*.test.mjs` - 1744 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Natural generation and `mongets(SHURIKEN)` object creation remain separate; this slice only selects metadata-bearing shuriken already present in monster inventory.
- Bare object-type recognition is intentionally left for the broader object registry/inventory consolidation because the current JS tree does not expose a stable shuriken `otyp` for this path.
- Shuriken multigen stack splitting, monster multishot, cursed/greased slip handling, poisoned shuriken, and role-specific monk/ninja class bonuses still need focused source-backed slices.
- Broader `hits_bars()` object-class coverage remains open for remaining arrows, harmless/flimsy objects, boulders/heavy iron balls, armor/tool/food gates, object breakage side effects, wakeup noise, and bar dissolution.
