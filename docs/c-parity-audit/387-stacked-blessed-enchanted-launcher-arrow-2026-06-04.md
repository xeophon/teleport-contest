# Stacked Blessed Enchanted Launcher Arrow Landing

Date: 2026-06-04

## Summary

Stacked blessed `+1` and `+2` monster-fired launcher arrows now use the same shared `drop_throw()` landing path as singleton blessed enchanted arrows after one projectile has been split from the stack. Stack quantity only controls volley/split behavior; once C has extracted a single projectile, hit/miss landing, mulch, blessed survival, deletion resistance, and metadata persistence are per-object and do not branch on the original stack size.

This slice also corrects bones restore identity accounting for death-cleanup thrown objects. C `done_object_cleanup()` places a lethal in-flight projectile on the floor for bones, and C bones restore assigns that ordinary floor object one new object id. JS now keeps the special extra restore identity burn only for transient display projectiles, not for materialized `_deathCleanupThrownObject` floor objects.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:207` through `:257`: `monmulti()` only considers multishot when the projectile has `quan > 1`, then clamps volley count to stack quantity.
- `nethack-c/upstream/src/mthrowu.c:298` through `:300`: each volley calls `m_throw(..., otmp)` separately.
- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts exactly one projectile. Singleton objects are removed from inventory; stacked objects use `splitobj(obj, 1L)` and then `obj_extract_self(singleobj)`.
- `nethack-c/upstream/src/mkobj.c:450` through `:502`: `splitobj()` copies the object struct and adjusts bookkeeping, preserving ordinary metadata such as BUC, enchantment, grease, erosion, poison, and naming fields on the split child.
- `nethack-c/upstream/src/mthrowu.c:618` through `:620`: after extraction C clears worn mask and may clear `dknown`; it does not clear BUC, enchantment, grease, or erosion.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: hit damage and to-hit use the extracted single projectile, including `spe`.
- `nethack-c/upstream/src/mthrowu.c:787` through `:816`: nonlethal hits and misses call `drop_throw(singleobj, ...)`.
- `nethack-c/upstream/src/mthrowu.c:162` through `:195`: `drop_throw()` runs missile mulch only when `ohit` is true; otherwise it places, ships, applies floor effects, and stacks the single object.
- `nethack-c/upstream/src/dothrow.c:1976` through `:1993`: `should_mulch_missile()` uses `chance = 3 + greatest_erosion(obj) - obj->spe`, then lets blessed monster-thrown missiles survive breakage on `!rn2(3)`.
- `nethack-c/upstream/src/invent.c:1428` through `:1447` and `nethack-c/upstream/src/zap.c:1458` through `:1472`: mulched arrows still pass through deletion resistance.
- `nethack-c/upstream/src/end.c:855` through `:883`: `done_object_cleanup()` places `gt.thrownobj` on the map for bones.
- `nethack-c/upstream/src/restore.c:231` through `:258`: bones restore assigns one new id per restored floor object in `restobjchn()`.

## JS changes

- `js/allmain.js`
  - Removes the `missileQuan <= 1` restriction from the blessed enchanted arrow shared-landing guard.
  - Routes stacked blessed `+1` and `+2` arrows, including eroded variants, through `_arrow_drop_throw_after_topline_more` for nonlethal hits and misses after the existing one-arrow split.
  - Leaves lethal launcher-arrow hits on the separate death-cleanup path and leaves cursed/greased preflight misfire and obstacle flight unchanged.
- `test/shop-billing-helpers.test.mjs`
  - Adds split-stack assertions for residual monster inventory and the landed one-arrow child.
  - Adds clean blessed stacked `+1` hit and miss regressions.
  - Adds a blessed eroded stacked `+2` hit regression to cover the erosion-side guard.
- `js/save.js`
  - Counts `_deathCleanupThrownObject` as an ordinary floor object during bones restore identity accounting.
  - Keeps the extra restore identity burn for top-level transient projectiles.
- `test/save-bones.test.mjs`
  - Adds a focused bones restore identity regression for ordinary death-cleanup thrown objects plus transient projectiles.

## Verification

- `node --check js/allmain.js`
- `node --check js/save.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --check test/save-bones.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "blessed stacked|blessed eroded stacked" test/shop-billing-helpers.test.mjs` (3 pass, 1540 skipped)
- `node --test --test-name-pattern "lethal launcher arrow|blessed stacked|blessed eroded stacked" test/shop-billing-helpers.test.mjs` (4 pass, 1539 skipped)
- `node --test --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` (41 pass, 1502 skipped)
- `node --test test/save-bones.test.mjs` (1 pass)
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` (RNG 105529/105529, Screen 1953/1953)
- `node --test test/*.mjs` (1687 pass)
- `npm run score` (44/44 passing)

## Remaining gaps

- Iron-bars, sink, and broader `MT_FLIGHTCHECK` obstacle flight remain separate.
- Life-saving after a lethal launcher-arrow hit remains a separate message/RNG-order slice because upstream can resume and then reach `drop_throw()`.
