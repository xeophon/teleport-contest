# Blessed Enchanted Singleton Launcher Arrow Drop-Throw

Date: 2026-06-04

## Summary

Routed clean blessed singleton `+1` and `+2` monster-fired launcher arrows, and blessed eroded singleton `+1` and `+2` launcher arrows, through the shared C-shaped `drop_throw()` landing path for nonlethal hits and misses. The shared helper already models hit-only missile mulch, the C blessed monster-moving survival roll, and deletion resistance; the remaining mismatch was the production guard that still excluded blessed enchanted singleton arrows from that path.

This slice also adds a greased eroded same-vector misfire canary. C uses curse or grease only for the preflight misfire gate; when the rerolled misfire vector is nonzero and matches the original direction, normal flight continues.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:201` through `:238`: `monmulti()` only rolls multishot when the projectile stack has more than one object.
- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts or splits one projectile while preserving BUC, grease, enchantment, and erosion fields.
- `nethack-c/upstream/src/mthrowu.c:622` through `:642`: cursed or greased projectiles use the preflight `rn2(7)` misfire gate; nonzero rerolled directions continue into normal flight.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: monster-thrown hero-hit damage uses `dmgval(singleobj, &gy.youmonst)` before `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:787` through `:789`: nonlethal hero hits call `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: misses and end-of-flight landings call `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:162` through `:175`: `drop_throw()` only runs missile mulch when `ohit` is true.
- `nethack-c/upstream/include/objects.h:141` through `:143`: ordinary arrow damage dice are `1d6`.
- `nethack-c/upstream/src/weapon.c:297` and `:344` through `:352`: `dmgval()` adds enchantment, subtracts `greatest_erosion()`, and clamps positive damage to at least 1.
- `nethack-c/upstream/src/dothrow.c:1976` through `:1993`: `should_mulch_missile()` uses `chance = 3 + greatest_erosion(obj) - obj->spe`, then lets blessed monster-thrown missiles survive on `!rn2(3)`.
- `nethack-c/upstream/src/invent.c:1430` through `:1446` and `nethack-c/upstream/src/zap.c:1469`: mulched ordinary arrows still pass through deletion resistance and consume `rn2(100)`.

## JS changes

- `js/allmain.js`
  - Allows singleton blessed `spe` `1` and `2` launcher arrows to use `_arrow_drop_throw_after_topline_more`.
  - Allows eroded singleton blessed `spe` `1` and `2` arrows to use the same shared path, matching the existing non-BUC and blessed `+0` eroded cases.
  - Keeps stacked blessed enchanted arrows on the existing legacy path until their bones/lethal persistence behavior is audited separately.
  - Leaves the existing cursed/greased preflight misfire routing, obstacle flight, and lethal arrow handling unchanged.
- `js/cmd.js`
  - No code change needed; `landMonsterThrownObject()` already implements C hit-only mulch, blessed survival, and deletion-resistance RNG.

No replay seed, map, player-name, move-count, or trace-conditioned behavior was added.

## Tests

- `production monster blessed singleton plus-one launcher arrow hit lands with shared blessed roll`
- `production monster blessed singleton plus-one launcher arrow miss lands with enchantment`
- `production monster blessed singleton plus-two launcher arrow hit can mulch after blessed survival fails`
- `production monster blessed singleton plus-two launcher arrow miss lands with enchantment`
- `production monster blessed eroded singleton plus-one launcher arrow hit uses enchantment minus erosion chance`
- `production monster blessed eroded singleton plus-one launcher arrow miss preserves metadata`
- `production monster blessed eroded singleton plus-two launcher arrow hit can mulch after blessed survival fails`
- `production monster blessed eroded singleton plus-two launcher arrow miss preserves metadata`
- `production monster greased eroded launcher arrow same-vector misfire continues normal flight`

The deterministic seeds select source branches in the existing unit harness only. They are not production gates.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` - 37 pass, 1502 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1539 pass
- `node --test test/*.mjs` - 1682 pass
- `bash frozen/score.sh sessions/seed0030-ten-diverse-deaths.session.json` - 1/1 passing
- `npm run score` - 44/44 passing

## Remaining gaps

- Obstacle/end-of-flight landing still needs the full C `MT_FLIGHTCHECK` and path termination behavior.
- Lethal launcher-arrow persistence remains separate because the JS death path is deferred through pending `--More--` handling.
- Stacked blessed enchanted launcher-arrow landing remains separate because it interacts with bones/death-pile persistence in public multi-segment sessions.
- Broader monster projectile/object-hit lifecycle cleanup remains under the monster-combat priority.
