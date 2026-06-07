# 672 - Attached Ball Blind Felt Glyph

## C Source

- `nethack-c/upstream/src/dothrow.c:1824` places a thrown attached iron ball before calling `drop_ball()`, and `nethack-c/upstream/src/dothrow.c:1839` calls `drop_ball()` when the thrown object is `uball`.
- `nethack-c/upstream/src/ball.c:882-888` snapshots blind ball/chain ordering and the glyph under the ball before relocation.
- `nethack-c/upstream/src/ball.c:944-952` clears the old blind chain felt state, resets `u.bc_felt`, moves the chain, and recomputes blind ball/chain order.
- `nethack-c/upstream/src/display.c:878-885` only displays felt ball/chain objects when the blind felt state says that object is currently felt.

## Port Notes

- `heroDropAttachedBallAfterThrow()` now clears the blind `_bcFelt` state and stale `_bcFeltGlyph` before redrawing the old hero square during attached-ball throw relocation.
- This keeps stale blind chain glyph memory from surviving after the ball drags the hero and chain to the new square.
- The change is limited to the attached-ball relocation path; vertical attached-ball throws that do not call the horizontal relocation helper retain their existing behavior.

## Tests

- `attached hero-thrown heavy iron ball uses C range cap and drags chain behind it`
- `blind attached hero-thrown heavy iron ball clears stale felt chain glyph`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "attached hero-thrown heavy iron ball uses C range cap and drags chain behind it|blind attached hero-thrown heavy iron ball clears stale felt chain glyph|floor-stuck attached hero-thrown heavy iron ball uses C range one|downward attached hero-thrown heavy iron ball stays attached|upward attached hero-thrown heavy iron ball stays attached" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Attached-ball blind glyph ordering is still simplified compared with C's `bc_order()`/`bglyph`/`cglyph` bookkeeping; this slice only removes stale felt display after relocation.
- Air/levitation recoil collision side effects and recoil trap effects remain separate C-backed throw slices.
