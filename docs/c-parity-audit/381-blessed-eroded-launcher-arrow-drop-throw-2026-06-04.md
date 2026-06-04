# Blessed Eroded Launcher Arrow Drop-Throw

Date: 2026-06-04

## Summary

Routed blessed eroded `+0` monster-fired launcher arrows through the shared C-shaped `drop_throw()` landing path for nonlethal hits and misses. This keeps erosion-adjusted damage from `dmgval()`, uses the ordinary `chance = 3 + greatest_erosion(obj) - obj->spe` hit-only mulch roll, and preserves the C blessed survival follow-up roll.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts or splits a single projectile before hit, miss, and landing handling.
- `nethack-c/upstream/src/allmain.c:210` through `:212`: monster turns run with `svc.context.mon_moving`, so blessed missile survival uses the monster-moving `rn2(3)` path.
- `nethack-c/upstream/src/mthrowu.c:622` through `:637`: cursed/greased preflight misfire is independent of blessed erosion and only redirects before normal flight.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: monster-thrown hero-hit damage uses `dmgval(singleobj, &gy.youmonst)`.
- `nethack-c/upstream/src/mthrowu.c:787` through `:789`: nonlethal hero hits call `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: misses and end-of-flight landings call `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/weapon.c:344` through `:352`: `dmgval()` subtracts `greatest_erosion()` from positive weapon damage and clamps to at least 1.
- `nethack-c/upstream/src/dothrow.c:1976` through `:1993`: `should_mulch_missile()` computes `chance = 3 + greatest_erosion(obj) - obj->spe`, then lets blessed monster-thrown missiles survive on `!rn2(3)`.
- `nethack-c/upstream/src/invent.c:1430` through `:1446` and `nethack-c/upstream/src/zap.c:1469`: mulched objects still pass through object deletion resistance, consuming `rn2(100)` for ordinary arrows.

## JS changes

- `js/allmain.js`
  - Keeps clean launcher-arrow sharing unchanged.
  - Allows eroded blessed `+0` arrows, but not blessed enchanted-eroded arrows, to queue `_arrow_drop_throw_after_topline_more`.
  - Keeps cursed/greased eroded no-misfire arrows outside this slice.
- `js/cmd.js`
  - No code change needed; `landMonsterThrownObject()` already models C hit-only mulch, blessed survival, and deletion-resistance RNG.

## Tests

- `production monster blessed eroded launcher arrow hit keeps blessed survival roll` covers a nonlethal hit that lands after erosion-adjusted damage, `rn2(4)` mulch survival, and the blessed `rn2(3)` follow-up.
- `production monster blessed eroded launcher arrow can survive by blessed roll` covers the branch where `rn2(4)` initially breaks the eroded arrow, then `rn2(3)=0` rescues it.
- `production monster blessed eroded launcher arrow hit can mulch after blessed survival fails` covers a hit where the eroded mulch roll breaks the arrow and the blessed survival roll fails, so deletion resistance is consumed.
- `production monster blessed eroded launcher arrow miss lands without ohit mulch` covers miss landing with blessed and erosion metadata preserved and no hit-only mulch RNG.

The deterministic test seeds select branches inside the existing unit harness only; no replay maps, move traces, fixture names, or seed-specific runtime shortcuts were added.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "blessed eroded launcher arrow|blessed launcher arrow|eroded launcher arrow" test/shop-billing-helpers.test.mjs` - 10 pass, 1516 skipped
- `node --test --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` - 24 pass, 1502 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1526 pass
- `node --test test/*.mjs` - 1669 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Cursed/greased eroded launcher arrows after the no-misfire path should be routed through `drop_throw()` in a separate slice.
- Same-vector misfire canaries, blessed enchanted-eroded arrows, broader blessed/enchanted launcher arrows, lethal arrow persistence, and obstacle flight remain separate projectile slices.
