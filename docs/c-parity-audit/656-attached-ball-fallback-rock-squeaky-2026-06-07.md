# 656 - Attached Ball Fallback Rock And Squeaky Board

## C Source

- `nethack-c/upstream/src/ball.c:891-958` relocates the hero after an attached-ball throw, moves the chain, then calls `spoteffects(TRUE)` on the new hero square.
- `nethack-c/upstream/src/hack.c:3375-3395` processes pickup before non-pit traps in `spoteffects(TRUE)`, then calls `dotrap()`.
- `nethack-c/upstream/src/trap.c:1061-1087` treats falling rock and squeaky board traps as floor triggers that levitation/flying skip.
- `nethack-c/upstream/src/trap.c:2996-3044` captures `already_seen`, applies in-air skip first, then applies the seen-trap escape roll.
- `nethack-c/upstream/src/trap.c:1324-1374` handles falling-rock trap effects: spent-trap deletion, rock creation, helmet/pass-rocks messaging, `Maybe_Half_Phys(d(2,6))`, death cause, and STR abuse.
- `nethack-c/upstream/src/trap.c:1403-1436` handles squeaky-board effects: mark seen, deaf vibration versus note message, and `wake_nearby(FALSE)`.

## Port Notes

- Added result-returning falling-rock and squeaky-board helpers so sitting, ordinary movement, deferred object-list handling, and attached-ball fallback relocation share the same trap effect core.
- Falling-rock movement now uses the C-style floor-trigger gates, places a rock on the hero square, applies half-physical damage, and propagates fatal/life-saving results through the same command-mode path used by projectile-style trap results.
- Squeaky-board movement now uses the same floor-trigger gates, marks the trap seen, emits deaf/nondeaf wording, and wakes nearby sleeping monsters.
- Attached-ball fallback relocation now triggers falling-rock and squeaky-board effects on the relocated hero square behind the thrown ball.
- Object-list and dismount-object-list deferred trap handling now consumes pending falling-rock and squeaky-board traps after the list is dismissed.

## Tests

- `ordinary movement onto falling rock trap drops rock and damages hero`
- `ordinary movement lethal falling rock trap uses life saving command mode`
- `ordinary movement onto squeaky board squeaks and wakes nearby monster`
- `dismount object list consumes pending falling rock trap`
- `object list squeaky board trap waits until more is dismissed`
- `attached ball fallback relocation triggers falling rock trap on new hero square`
- `attached ball fallback relocation triggers squeaky board on new hero square`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "ordinary movement onto falling rock|ordinary movement lethal falling rock|ordinary movement onto squeaky board|dismount object list consumes pending falling rock|object list squeaky board trap waits|attached ball fallback relocation triggers falling rock|attached ball fallback relocation triggers squeaky board" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Blind ball/chain glyph ordering after attached-ball relocation remains open.
- Attached-ball fallback relocation still needs canaries for bear, polymorph, dart, and rolling-boulder launch-path details.
- Magic trap, anti-magic, teleport, level-teleport, magic portal, and statue-trap relocation effects need separate source-backed slices because their current JS helpers are async, string-only, or carry broader command-flow side effects.
- Full rust trap parity still needs targeted water damage, lit item splashing, gremlin split, and iron-golem rust fallout beyond the current modeled movement branch.
