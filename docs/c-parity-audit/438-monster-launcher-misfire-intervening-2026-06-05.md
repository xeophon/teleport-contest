# Monster Launcher Misfire Intervening Hit

Date: 2026-06-05

## Summary

Redirected cursed/greased monster-fired launcher-arrow misfires now use the same current-square monster check as the C `m_throw()` flight loop. A misfired arrow advances square by square, checks for a live monster before terrain, rolls the accidental `ohitmon()` hit threshold, wakes and damages the hit monster, then routes the projectile through the existing hit-drop/mulch path.

This is a source-backed production broadening only. It does not add replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:622` through `:633`: cursed or greased thrown objects with a nonzero original vector can misfire, print the ammo misfire message, choose new `rn2(3) - 1` direction components, and immediately drop at the shooter for a zero vector.
- `nethack-c/upstream/src/mthrowu.c:639` through `:642`: after misfire direction selection, `m_throw()` enters the common preflight and flight handling rather than a separate terrain-only path.
- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: each flight step advances the missile, checks `m_at()`, and resolves `ohitmon()` before the hero and before terrain.
- `nethack-c/upstream/src/mthrowu.c:340` through `:357`: `ohitmon()` uses `5 + find_mac() + omon_adj(..., FALSE)` against `rnd(20)`; a miss with remaining range continues, while a miss at final range drops on the monster square.
- `nethack-c/upstream/src/mthrowu.c:373` through `:494`: a monster hit wakes and damages the target, then stops flight and drops or mulches the missile with `ohit`.
- `nethack-c/upstream/src/mthrowu.c:798` through `:815`: end-of-range, sink, and obstacle handling happen only after current-square monster and hero handling.

## JS Changes

- `js/allmain.js`
  - Extracts the launcher-arrow intervening hit resolution into a local helper shared by normal aimed shots and redirected misfires.
  - Checks `monsterAtFlightSquare(landingX, landingY, mon)` inside the redirected misfire scan before the existing iron-bars/sink/ordinary-terrain `rn2(5)` handling.
  - Drops a missed final-range misfire on the occupied monster square, matching `ohitmon()`'s last-position miss behavior.
  - Keeps zero-vector misfires, same-vector misfires, and no-monster redirected terrain RNG paths unchanged.
- `test/shop-billing-helpers.test.mjs`
  - Adds a redirected greased launcher-arrow misfire test with an intervening monster on the live redirected path.
  - Pins the RNG ordering so the occupied square consumes `rnd(20)` and damage before hit-drop mulch handling, while existing no-monster terrain tests keep their exact `rn2(5)` sequences.

## Tests

- `production monster greased launcher arrow redirected misfire can hit intervening monster`
- `production monster * launcher arrow * misfire *` regression group

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "production monster greased launcher arrow redirected misfire can hit intervening monster" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "launcher arrow.*misfire" test/shop-billing-helpers.test.mjs` - 16 pass
- `git diff --check` - pass
- `node --test test/shop-billing-helpers.test.mjs` - 1669 pass
- `node --test test/*.test.mjs` - 1820 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Intervening monster hits still use the current minimal monster-damage branch and do not perform full `xkilled()`/`mondied()` cleanup.
- Intervening monster poison, silver, blinding, egg, acid-venom, and mimic-reveal side effects remain outside this slice.
- Monster-vs-monster aimed shooter-level and artifact-launcher bonuses remain separate from hero-directed launcher shots.
