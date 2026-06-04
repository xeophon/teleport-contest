# Eroded Launcher Arrow Drop-Throw

Date: 2026-06-04

## Summary

Routed non-BUC eroded monster-fired launcher arrows through the shared C-shaped `drop_throw()` landing path for nonlethal hits and misses. Arrow damage now subtracts `greatest_erosion()` before the C minimum-damage clamp, and hit-only missile mulch now uses the existing `chance = 3 + greatest_erosion(obj) - obj->spe` helper instead of the legacy fixed arrow mulch shim.

## Upstream source anchors

- `nethack-c/upstream/include/obj.h:124` through `:128`: `greatest_erosion(otmp)` is the maximum of `oeroded` and `oeroded2`.
- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts or splits a single projectile before flight and hit handling.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: monster-thrown hero-hit damage uses `dmgval(singleobj, &gy.youmonst)` before `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:787` through `:789`: nonlethal hero hits call `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: misses and end-of-flight landings call `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/weapon.c:344` through `:352`: `dmgval()` subtracts `greatest_erosion()` from positive weapon damage and clamps the result to at least 1.
- `nethack-c/upstream/src/dothrow.c:1976` through `:1993`: `should_mulch_missile()` uses `chance = 3 + greatest_erosion(obj) - obj->spe`, with the blessed survival roll as a separate follow-up.

## JS changes

- `js/allmain.js`
  - Computes launcher-arrow `missileErosion` from `oeroded`/`oeroded2` on the extracted projectile.
  - Subtracts erosion from monster launcher-arrow damage before the existing minimum-damage clamp.
  - Allows eroded non-blessed, non-cursed, non-greased launcher arrows in the already-covered `+0`, `+1`, and `+2` states to use `_arrow_drop_throw_after_topline_more`.
  - Leaves blessed eroded arrows, cursed/greased eroded arrows, lethal arrow hits, and obstacle flight outside this slice.

## Tests

- `production monster eroded launcher arrow hit uses erosion damage and mulch chance` covers a surviving eroded `+0` hit with reduced damage, `rn2(4)` survival, and landed erosion metadata.
- `production monster eroded launcher arrow hit can mulch before landing` covers the C `chance > 1` break branch where nonzero `rn2(4)` mulches and consumes deletion resistance.
- `production monster eroded launcher arrow miss lands without ohit mulch` covers miss landing, erosion persistence, and no hit-only mulch/deletion-resistance RNG.
- `production monster eroded plus-one launcher arrow uses C erosion minus enchantment chance` covers the non-BUC `+1` erosion/enchantment combination using `chance = 3`.

The deterministic test seeds select source branches in the existing unit harness only; no replay maps, move traces, or fixture-specific runtime shortcuts were added.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` - 20 pass, 1502 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1522 pass
- `node --test test/*.mjs` - 1665 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Blessed eroded launcher arrows still need the extra C blessed survival roll combined with erosion.
- Cursed/greased eroded launcher arrows after no-misfire, same-vector misfire canaries, lethal arrow persistence, and broader obstacle flight remain separate projectile slices.
