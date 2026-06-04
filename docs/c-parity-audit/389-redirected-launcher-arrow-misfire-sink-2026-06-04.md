# Redirected Launcher Arrow Misfire Sink

Date: 2026-06-04

## Summary

Redirected cursed/greased monster-fired launcher-arrow misfires now stop when the projectile's current square is a sink, matching the C `MT_FLIGHTCHECK(FALSE, forcehit)` ordering. The redirected flight still moves into an open square first, consumes the per-square `rn2(5)` force-hit roll, then checks for end-of-range, sink, and ordinary blockers. A visible sink prints the C ordinary arrow wording, `The arrow drops onto the sink.`, and the extracted arrow lands on the sink through the existing `drop_throw(..., ohit=0)`-shaped path without hit-only mulch.

This is intentionally limited to redirected cursed/greased launcher-arrow misfires. Iron-bar `hits_bars()` pass-through/breakage and normal aimed-shot obstacle flight remain separate slices.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:552` through `:568`: `MT_FLIGHTCHECK` includes the sink stop only for post-move checks, using the current `gb.bhitpos` square.
- `nethack-c/upstream/src/mthrowu.c:673` through `:799`: monster-thrown flight moves first, then consumes `forcehit = !rn2(5)` before end-of-range or obstacle checks.
- `nethack-c/upstream/src/mthrowu.c:799` through `:807`: sink messaging requires remaining range, `cansee()`, and a sink on the current square; hallucination changes the verb from drop to plop.
- `nethack-c/upstream/src/mthrowu.c:814` through `:816`: stopped projectiles call `drop_throw(singleobj, 0, x, y)`, so ordinary arrows skip hit-only mulch.
- `nethack-c/upstream/src/mthrowu.c:162` through `:195`: `drop_throw(..., ohit=0)` places/ships/applies floor effects and stacking for the single projectile.

## JS changes

- `js/allmain.js`
  - Imports `SINK` for redirected misfire terrain checks.
  - Adds a current-square sink stop after each redirected misfire step consumes `rn2(5)`.
  - Emits `The arrow drops onto the sink.` or hallucinated `The arrow plops onto the sink.` only for non-blind heroes who can see the sink square.
  - Leaves zero-vector, same-vector, ordinary blocker, and unobstructed redirected misfires on their existing paths.
- `test/shop-billing-helpers.test.mjs`
  - Lets launcher-arrow tests mark custom terrain cells visible.
  - Adds a redirected greased launcher-arrow misfire regression for a visible sink, covering message timing, two consumed flight `rn2(5)` rolls, sink-square landing, grease preservation, and no hit-only mulch/deletion-resistance RNG.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "redirected misfire .*sink|redirected misfire stops|redirected misfire lands away" test/shop-billing-helpers.test.mjs` (4 pass, 1542 skipped)
- `node --test --test-name-pattern "launcher arrow" --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` (RNG 105529/105529, Screen 1953/1953)
- `node --test --test-reporter=dot test/*.mjs`
- `git diff --check`
- `npm run score` (44/44 passing)

## Remaining gaps

- Iron-bar `hits_bars()` pass-through/breakage and `Clonk!` messaging remain separate.
- Normal aimed launcher-arrow obstacle flight remains separate because ordinary terrain generally participates in the earlier line-up decision.
