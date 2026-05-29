# Tiphat Target Conflict 2026-05-29

Implemented a narrow command/menu slice from the fresh agent audit round. No private fixtures were inspected.

## C Anchors

- `tiphat()` clears a responding monster's `STRAT_WAITMASK` before choosing the response: `nethack-c/upstream/src/sounds.c:1503`.
- Peaceful visible humanoids only wave/tip/grasp when `!Conflict`; `Conflict` combines intrinsic and extrinsic conflict: `nethack-c/upstream/src/sounds.c:1506`, `nethack-c/upstream/include/youprop.h:216`.
- Cursed monster helmets set `bknown` when the monster grasps the helmet: `nethack-c/upstream/src/sounds.c:1509`.
- Hostile or conflicted visible humanoids choose between `curses`, `gestures rudely`, and `gestures offensively`, with the C deaf/non-deaf RNG split and possible second phrase: `nethack-c/upstream/src/sounds.c:1517`.

## JS Work

- Added `heroHasConflict()` for `tiphat()` target reactions, covering explicit hero conflict fields, intrinsic/extrinsic containers used by existing JS state, and worn ring-of-conflict objects.
- Added C-shaped rude humanoid reaction selection, including the non-deaf `rn2(3)`/optional `rn1(2,1)` second phrase and deaf `rn1(2,1)` branch.
- Cleared the string test-fixture wait strategy `'waitforu'` alongside numeric `STRAT_WAITMASK`.
- Kept the existing peaceful wave/tip/grasp structure, now gated by shared conflict detection.

## Public Tests

Added focused tests in `test/shop-billing-helpers.test.mjs`:

- Peaceful visible humanoid without a helmet waves and clears string wait strategy.
- Peaceful visible humanoid with an uncursed monster helmet tips it.
- Peaceful visible humanoid with a cursed monster helmet grasps it and learns `bknown`.
- Worn ring of conflict routes a peaceful humanoid into the rude RNG branch.

## Fresh Subagent Findings Kept For Next Slices

- Object polymorph: floor amulet of unchanging is still missing from the wand floor unpolyable list, `polymorphFloorPileAt()` still returns affected for wholly unpolyable piles, lateral wand polymorph is still adjacent-only, and monster-first `bhit()` traversal remains open.
- Vertical floor effects: upward hiding-under targeting for wand polymorph and stone-to-flesh remains open; downward hiding-under top-object skip is the paired follow-up.
- Stone-to-flesh/object polymorph: `cant_revive()` doppelganger fallback, saved monster traits, and boulder/restack cleanup remain open.
- Monster-thrown `drop_throw(ohit)`: production hit-state threading, hit-only missile mulch, and passive-object effects remain open.
- Migration: carried non-gold drops through down stairs/ladders/special stairs are the next small down-gate slice; carried gold and kicked object shipping should stay separate.
- `tiphat()` still lacks steed noise, unseen/statue/glyph scan parity, adjacent unseen responsive monsters, and nonhumanoid `domonnoise()` reactions.

## Verification

- `node --check js/cmd.js`
- `node --test --test-name-pattern "worn helmet tip|helmet tip|tip makes a peaceful|ring of conflict routes|ordinary carried tip|non-worn helmet tip|cursed worn helmet tip|tip selections" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` -> `44/44 passing`
