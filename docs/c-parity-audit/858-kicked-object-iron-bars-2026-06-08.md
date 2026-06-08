# Kicked object iron bars

Date: 2026-06-08.

## C anchors

- `nethack-c/upstream/src/zap.c:3900` routes thrown and kicked physical objects through the iron-bars check before monster impact.
- `nethack-c/upstream/src/zap.c:3905` calls `hits_bars()` with `point_blank ? 0 : !rn2(5)`, so only later non-class hits consume the force-hit roll.
- `nethack-c/upstream/src/zap.c:3909` backs `gb.bhitpos` up when bars stop the kicked object.
- `nethack-c/upstream/src/zap.c:4122` clears `point_blank` after the first travelled square.
- `nethack-c/upstream/src/mthrowu.c:1499` defines `hits_bars()` for thrown, kicked, and rolled objects.
- `nethack-c/upstream/src/mthrowu.c:1511` makes most weapons hit bars by class but lets knife/spear/dart/shuriken/bow/crossbow-shaped objects use the force-hit roll.
- `nethack-c/upstream/src/mthrowu.c:1454` emits the bars impact sound for surviving hits and `mthrowu.c:1477` gives hero-caused war hammers a chance to break bars apart.
- `nethack-c/upstream/src/dokick.c:771` lands surviving kicked objects at `gb.bhitpos` through floor effects, placement, stacking, and redraw.

## JS update

- `js/cmd.js` now checks iron bars during same-level kicked-object flight before monster and trap checks.
- Class-hit kicked objects such as daggers stop before the bars without a force-hit roll and consume the surviving impact `rn2(100)`.
- Small non-class objects such as knives pass later bars on nonzero `rn2(5)` and stop on zero, then consume `rn2(100)` and emit the established bars sound.
- Hero-caused kicked war hammer impacts reuse the existing bar-dissolve helper when the C-shaped break chance succeeds.
- `test/shop-billing-helpers.test.mjs` adds command-level canaries for dagger class hits, knife pass-through, and knife forced hits.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "later iron bars|forced to hit later iron bars|pass later iron bars" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "command kick ordinary floor object|command kicked ordinary floor object|command kicked dagger|command kicked knife|command kicked shop-floor ordinary object|command kicked fragile|same-level floor object stacks|Mjollnir floor object" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44 passing`)
