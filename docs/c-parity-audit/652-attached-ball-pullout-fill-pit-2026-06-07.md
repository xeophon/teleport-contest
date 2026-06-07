# 652 - Attached Ball Pull-Out Fill Pit

## C Source

- `nethack-c/upstream/src/ball.c:891-925` runs attached-ball trap pull-out when the ball lands away from the hero and resets eligible hero trap state.
- `nethack-c/upstream/src/ball.c:925-926` calls `fill_pit(u.ux,u.uy)` after trap reset and before moving the hero.
- `nethack-c/upstream/src/trap.c:4008-4017` has `fill_pit()` only act when the old hero square has a pit/hole trap and a boulder, extracts that boulder, and routes it through `flooreffects(..., "settle")`.
- `nethack-c/upstream/src/do.c:187-261` handles the boulder floor effect: deleting the pit/hole/trapdoor trap, burying other objects on the square, and printing the visible fill/plug message.

## Port Notes

- Attached-ball trap pull-out now calls a small `heroDropBallFillPitAt()` helper after clearing hero trap state.
- The helper reuses existing boulder floor-effects logic with verb `settle`, so ordinary pit pull-out still leaves the pit trap alone, while pit/hole squares with a boulder are filled.

## Tests

- `attached ball throw pull-out lets old-square boulder fill pit`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "attached ball throw pulls hero out of pit|attached ball throw pull-out lets old-square boulder fill pit|mounted attached ball throw" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Blind ball/chain glyph ordering and `spoteffects(TRUE)` after hero relocation remain open.
- Pool/pit/hole landing with a monster on the ball square, levitating pool/pit/hole landing, and dedicated hole/trapdoor landing canaries remain open.
