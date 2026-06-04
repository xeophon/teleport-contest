# Monster Crossbow Bolt Iron Bars

Date: 2026-06-04

## Summary

Monster-fired crossbow bolts now use projectile-specific launcher text and C-shaped small-target bolt damage while sharing the covered launcher projectile flight path. In C, `CROSSBOW_BOLT` is iron `-P_CROSSBOW` ammo: `hits_bars()` lets it pass through iron bars unless the non-adjacent flight `forcehit = !rn2(5)` roll forces a terrain hit. Forced bar hits still run object resistance, print ordinary iron `Clonk!` unless the hero is Deaf, skip hero hit/catch/mulch handling, and land the surviving bolt on the thrower-side square with `ohit=false`.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/include/objects.h:155` through `:157`: `crossbow bolt` is iron `-P_CROSSBOW` ammo with small damage die `4`.
- `nethack-c/upstream/include/objects.h:405` through `:406`: `crossbow` is the matching `P_CROSSBOW` launcher.
- `nethack-c/upstream/include/obj.h:238` through `:243`: `is_ammo()` and `ammo_and_launcher()` classify crossbow bolts as launcher ammo matched to crossbows.
- `nethack-c/upstream/src/weapon.c:216` through `:355`: `dmgval()` uses small-target object dice, adds `+1` for `CROSSBOW_BOLT`, then applies enchantment and erosion.
- `nethack-c/upstream/src/weapon.c:498` through `:502`: the monster ranged table includes `CROSSBOW_BOLT`.
- `nethack-c/upstream/src/weapon.c:612` through `:665`: `select_rwep()` chooses ranged ammo and the required crossbow propellor.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: `monshoot()` names the fired object and routes through `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:552` through `:568`: missile preflight/flight checks route iron bars through `hits_bars()`.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: non-adjacent missile flight consumes `forcehit = !rn2(5)` before checking next-square terrain, and stopped missiles use `drop_throw(..., 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:1447` through `:1467`: ordinary iron bar impact sound is `Clonk!` unless the hero is Deaf.
- `nethack-c/upstream/src/mthrowu.c:1512` through `:1520`: `-P_CROSSBOW` ammo passes through iron bars unless `always_hit`/`forcehit` is set.

## JS Changes

- `js/allmain.js`
  - Derives launcher projectile text from the fired missile object instead of hardcoding arrow wording for catch, miss, hit, sink, and lethal-death text.
  - Keeps existing bow/arrow behavior while allowing crossbow bolts to report `a crossbow bolt`.
  - Uses `rnd(4) + 1 + spe - erosion` for crossbow bolt hero-hit damage while arrows continue to use `rnd(6) + spe - erosion`.
- `test/shop-billing-helpers.test.mjs`
  - Parameterizes the production launcher helper with `launcherKind`.
  - Adds crossbow-bolt regressions for iron-bars pass-through, forced `Clonk!`, Deaf silence, and hit damage/text.

## Tests

- `production monster crossbow bolt aimed shot can pass through iron bars before hero`
- `production monster crossbow bolt hit uses crossbow bolt damage and text`
- `production monster crossbow bolt aimed shot can clonk iron bars before hero`
- `production monster crossbow bolt aimed iron bars are silent when deaf`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern 'crossbow bolt' test/shop-billing-helpers.test.mjs` - 4 pass, 1573 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1577 pass
- `node --test test/*.test.mjs` - 1721 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Shuriken is still metadata-only in the current JS object path and needs object-generation plus monster-selection work before a production iron-bars slice.
- Broader `hits_bars()` object-class coverage remains open for remaining arrows, stones/gems, spears, harmless/flimsy objects, boulders/heavy iron balls, armor/tool/food gates, object breakage side effects, wakeup noise, and bar dissolution.
