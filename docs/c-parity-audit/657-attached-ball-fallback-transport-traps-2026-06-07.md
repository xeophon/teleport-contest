# 657 - Attached Ball Fallback Transport Traps

## C Source

- `nethack-c/upstream/src/ball.c:891-958` relocates the hero after an attached-ball throw, moves the chain, then calls `spoteffects(TRUE)` on the new hero square.
- `nethack-c/upstream/src/hack.c:3375-3395` processes pickup before non-pit traps in `spoteffects(TRUE)`, then calls `dotrap()`.
- `nethack-c/upstream/src/trap.c:1061-1087` excludes level-teleport traps and magic portals from floor-trigger handling, so levitation and flying do not skip them.
- `nethack-c/upstream/src/trap.c:3035-3043` applies seen-trap escape to ordinary seen, escapable traps before the specific trap effect; `MAGIC_PORTAL` is not escapable.
- `nethack-c/upstream/src/trap.c:2088-2109` handles level-teleport traps by marking them seen, deleting the trap before successful level-teleport handling, and using the Amulet/Sokoban disorientation branch without leaving the level.
- `nethack-c/upstream/src/trap.c:2710-2732` and `nethack-c/upstream/src/teleport.c:1444-1485` handle magic portals by marking/revealing the portal, stunning the hero briefly, and scheduling branch travel when the destination differs from the current level.

## Port Notes

- Attached-ball fallback relocation now routes `LEVEL_TELEP` and `MAGIC_PORTAL` through the existing movement transport trap result helper on the relocated hero square.
- Level-teleport fallback relocation now shares ordinary movement behavior, including C-style trap deletion and the stable Amulet/Sokoban disorientation branch.
- Magic-portal fallback relocation now shares ordinary movement behavior, including trap marking, brief stun, message-more gating, and deferred portal-arrival level change state.
- Anti-magic fallback relocation is covered by audit 658, same-level teleport plus magic traps are covered by audit 659, and statue traps are covered by audit 660.

## Tests

- `attached ball fallback relocation triggers level teleporter on new hero square`
- `attached ball fallback relocation activates magic portal on new hero square`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "attached ball fallback relocation triggers level teleporter|attached ball fallback relocation activates magic portal|attached ball throw onto occupied hole" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Blind ball/chain glyph ordering after attached-ball relocation remains open.
- Full rust trap parity still needs targeted water damage, lit item splashing, gremlin split, and iron-golem rust fallout beyond the current modeled movement branch.
