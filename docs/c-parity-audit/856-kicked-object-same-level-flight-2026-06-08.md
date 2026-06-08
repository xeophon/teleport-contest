# Kicked object same-level flight

Date: 2026-06-08.

## C anchors

- `nethack-c/upstream/src/dokick.c:489` selects the top floor object for `kick_object()`.
- `nethack-c/upstream/src/dokick.c:516` rejects no object, boulders, the hero's ball, and the hero's chain before ordinary kicked-object movement.
- `nethack-c/upstream/src/dokick.c:558` computes kicked-object range from hero strength and one item of non-gold stack weight.
- `nethack-c/upstream/src/dokick.c:578` applies martial, pool, air/water, ice, grease, Mjollnir, and blocked-next-square range modifiers.
- `nethack-c/upstream/src/dokick.c:682` treats `range < 2` as no movement, printing `Thump!` for non-box objects.
- `nethack-c/upstream/src/dokick.c:733` extracts movable objects and launches them through `bhit(..., KICKED_WEAPON, ...)`.
- `nethack-c/upstream/src/zap.c:3846` starts `KICKED_WEAPON` flight one square in front of the hero and decrements range, so `range == 2` moves one square past the source object.
- `nethack-c/upstream/src/zap.c:4076` backs up before blocked terrain, and `nethack-c/upstream/src/zap.c:4089` stops physical kicked objects in pools, lava, and sinks.
- `nethack-c/upstream/src/dokick.c:771` applies `flooreffects(..., "fall")`, then places, stacks, and redraws the landed object.

## JS update

- `js/cmd.js` now lets ordinary supported floor objects continue past the old no-gate/no-monster fallback into same-level flight.
- `kickFloorObjectRange()` now applies the C Mjollnir forced-low-range rule.
- `kickedSameLevelFlightStop()` traces the C-shaped open-terrain subset: up to `range - 1` squares, stopping before blocked terrain or farther monsters, and stopping on pools, lava, sinks, or the first down-gate.
- Landing reuses `placeKickedFloorObject()`, preserving existing floor effects, stacking, and redraw behavior.
- `test/shop-billing-helpers.test.mjs` adds command-level canaries for open-room flight, blocked-terrain stop, landing stack merge, low-range `Thump!`, and Mjollnir forced low range.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "same-level open terrain|blocked same-level terrain|same-level floor object stacks|low-range ordinary floor object|Mjollnir floor object" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "command kick ordinary floor object|command kicked shop-floor ordinary object|command kicked fragile|command kick Mjollnir|same-level floor object stacks" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44 passing`)
