# 653 - Attached Ball Post-Relocation Effects

## C Source

- `nethack-c/upstream/src/ball.c:891-958` has `drop_ball()` relocate the hero after an attached-ball throw, then call `spoteffects(TRUE)` when the hero's square changed.
- `nethack-c/upstream/src/ball.c:931-938` moves the hero directly onto the ball landing square only when the hero is not levitating, no monster occupies the ball square, the hero is no longer trapped, and the ball landed on pool, pit, hole, or trap door terrain.
- `nethack-c/upstream/src/hack.c:3349-3379` runs liquid effects before trap effects inside `spoteffects(TRUE)`.
- `nethack-c/upstream/src/trap.c:1850-1950` handles ordinary pit entry, and `nethack-c/upstream/src/trap.c:2013` plus `trap.c:602-694` handle hole/trapdoor falling.

## Port Notes

- Attached-ball relocation now runs a focused post-relocation effect helper for pool, pit, hole, and trap door squares.
- Pool landing reuses the existing water-fallout crawl-out scheduling helper and preserves the landing `--More--`.
- Pit and shaft landing reuse `movementPitResult()` and `movementTransportTrapResult()`, preserving trap state, damage, fall-through scheduling, and fatal/lifesaving result handling.
- The thrown attached ball remains exempt from ordinary object shaft shipping; only the relocated hero receives the post-square effect.

## Tests

- `attached ball throw into pool pulls hero onto ball square`
- `attached ball throw into unseen pit triggers post-relocation pit effects`
- `attached ball throw into unseen hole schedules post-relocation fall through`
- `attached ball throw onto occupied hole leaves hero behind without shaft effects`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "attached ball throw|attached hero-thrown heavy iron ball|floor-stuck attached|downward attached|upward attached" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Blind ball/chain glyph ordering after attached-ball relocation remains open.
- Levitating pool/pit/hole landing canaries remain open.
- Broader extraction of ordinary movement `spoteffects(TRUE)` behavior for other trap types after attached-ball fallback relocation remains open.
