# Redirected Launcher Arrow Misfire Obstacles

Date: 2026-06-04

## Summary

Redirected cursed/greased monster-fired launcher-arrow misfires now stop before ordinary C `MT_FLIGHTCHECK` blockers instead of always landing at full range. After the misfire direction is rerolled, JS now checks the next square for map bounds, obstructed terrain, and closed/locked doors before entering it, then consumes one `rn2(5)` force-hit roll per open flight square before checking the next square. Blocked redirected misfires land the extracted single arrow on the current square with `ohit=false`.

This is intentionally limited to ordinary wall/out-of-bounds/closed-door blockers for redirected misfires. Sink and iron-bar behavior remain separate because C has sink-specific messaging and `hits_bars()` pass-through/breakage RNG.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts or splits one projectile before flight, then stores it in `gt.thrownobj`.
- `nethack-c/upstream/src/mthrowu.c:622` through `:637`: cursed/greased projectiles roll `!rn2(7)` for misfire, then reroll `dx` and `dy`; only a zero-vector misfire returns immediately.
- `nethack-c/upstream/src/mthrowu.c:552` through `:568`: `MT_FLIGHTCHECK` stops before out-of-bounds, obstructed terrain, closed doors, and some iron-bar hits; sink checks apply only after flight starts.
- `nethack-c/upstream/src/mthrowu.c:673` through `:799`: the loop moves into an open square, then consumes `forcehit = !rn2(5)` before end-of-range or obstacle checks.
- `nethack-c/upstream/src/mthrowu.c:799` through `:816`: blocked/end-of-range projectiles call `drop_throw(singleobj, 0, gb.bhitpos.x, gb.bhitpos.y)`.
- `nethack-c/upstream/src/mthrowu.c:162` through `:195`: `drop_throw(..., ohit=0)` skips hit-only missile mulch and places/ships/applies floor effects for the single projectile.

## JS changes

- `js/allmain.js`
  - Replaces fixed full-range redirected cursed/greased launcher-arrow misfire landing with a C-ordered ordinary blocker walk.
  - Lands at the shooter when the rerolled direction is immediately blocked.
  - Lands at the last open square before a wall/out-of-bounds/closed-door blocker after consuming exactly one `rn2(5)` per open flight square.
  - Keeps zero-vector misfires and same-vector misfires on their existing paths.
- `test/shop-billing-helpers.test.mjs`
  - Adds `levelCells` terrain overrides to the launcher-arrow helper.
  - Adds redirected greased misfire regressions for a wall blocker and a closed-door blocker.
  - Keeps the existing unobstructed redirected misfire regression as a full-range canary.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "redirected misfire stops" test/shop-billing-helpers.test.mjs` (2 pass, 1543 skipped)
- `node --test --test-name-pattern "redirected misfire lands away" test/shop-billing-helpers.test.mjs` (1 pass, 1544 skipped)
- `node --test --test-name-pattern "launcher arrow" --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node frozen/ps_test_runner.mjs sessions/seed0030-ten-diverse-deaths.session.json` (RNG 105529/105529, Screen 1953/1953)
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (44/44 passing)

## Remaining gaps

- Sink stop-on-current-square messaging remains separate.
- Iron-bar `hits_bars()` pass-through/breakage and `Clonk!` messaging remain separate.
- Normal aimed launcher-arrow obstacle flight remains separate because ordinary terrain generally participates in the earlier line-up decision.
