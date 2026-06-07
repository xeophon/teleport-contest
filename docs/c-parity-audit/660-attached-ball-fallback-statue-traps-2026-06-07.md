# 660 - Attached Ball Fallback Statue Traps

## C Source

- `nethack-c/upstream/src/dothrow.c:1823-1838` places a thrown punished iron ball, then calls `drop_ball()`.
- `nethack-c/upstream/src/ball.c:891-958` relocates the hero behind the thrown ball, moves the chain to the hero square, then calls `spoteffects(TRUE)`.
- `nethack-c/upstream/src/hack.c:3375-3395` performs pickup before non-pit traps, then calls `dotrap()`.
- `nethack-c/upstream/src/trap.c:3007-3039` runs the shared known-trap escape prelude before dispatching trap effects.
- `nethack-c/upstream/include/trap.h:116-117` shows `STATUE_TRAP` is not an undestroyable trap, so known statue traps get the ordinary 1-in-5 escape check.
- `nethack-c/upstream/src/trap.c:2279-2287` dispatches hero `STATUE_TRAP` activation through `activate_statue_trap()`.
- `nethack-c/upstream/src/trap.c:908-940` deletes the trap, tries same-square statues until animation succeeds or failure is not unique-only, then redraws the square.
- `nethack-c/upstream/src/trap.c:726-905` animates the statue, releases a hostile monster, transfers statue contents to monster inventory, and removes the statue object.

## Port Notes

- Attached-ball fallback relocation now awaits the post-relocation trap path so async statue animation can run inside the throw command.
- Added `movementStatueTrapResult()` to share the C-style known-trap escape prelude and reuse the existing `activateStatueTrap()` helper.
- Unknown statue traps now delete the trap and animate the statue after the chain pulls the hero onto the trap square.
- Known statue traps now make the ordinary 1-in-5 escape roll before deleting the trap or animating the statue.
- The result helper marks message-less activations as effects so trap deletion still counts even when no visible message is produced.

## Tests

- `attached ball fallback relocation triggers statue trap on new hero square`
- `attached ball fallback relocation gives known statue trap escape prelude`
- `attached ball fallback relocation deletes statue trap with no statue to animate`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "attached ball fallback relocation triggers statue trap|attached ball fallback relocation gives known statue trap|attached ball fallback relocation deletes statue trap" test/shop-billing-helpers.test.mjs`
- Broader attached-ball trap verification includes the statue canaries with the prior portal, teleport, magic, anti-magic, web, gas, rust, fire, landmine, arrow, dart, poly, bear, rolling-boulder, rock, and squeaky-board fallback cases.

## Remaining Follow-Ups

- Bear, polymorph, dart, rolling-boulder launch-path, and flying floor-trigger skip canaries are covered by audit 663.
- Levitating attached-ball throw recoil still needs separate source-backed coverage beyond the flying fallback floor-trigger skip canaries.
- One-shot vault teleport trap fallback and ordinary random teleport-trap fallback are covered by audit 662.
- Magic-trap fate 20 remove-curse/unpunish parity is covered by audit 661.
- Blind ball/chain glyph ordering after attached-ball relocation remains open.
