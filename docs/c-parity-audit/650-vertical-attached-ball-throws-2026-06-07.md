# 650 - Vertical Attached Ball Throws

## C Source

- `nethack-c/upstream/src/dothrow.c:1562` records the live thrown object pointer; a carried `uball` remains the same object after it leaves inventory.
- `nethack-c/upstream/src/dothrow.c:1588-1598` handles vertical throws before horizontal range, recoil, `bhit()`, and the final projectile landing block.
- `nethack-c/upstream/src/dothrow.c:1588` sends upward non-returning throws through `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1595` sends downward throws directly through `hitfloor(obj, TRUE)`.
- `nethack-c/upstream/src/dothrow.c:603-646` has `hitfloor()` act at the hero square, print the floor-hit line on hard terrain, run break/ship handling, and then drop the object.
- `nethack-c/upstream/src/do.c:827-833` calls `drop_ball(u.ux, u.uy)` after dropping `uball`; because the coordinates are the hero square, `ball.c:891` skips the relocation and trap pull-out block.

## Port Notes

- Attached `t <` and `t >` now use an explicit vertical branch before the cloned upward-object helpers.
- The branch reuses the live `game.u.uball` object, removes it from inventory, and restores the same ball and chain objects on the floor.
- Downward throws now use the hero-square hard-floor `hitfloor()` message and skip horizontal range, recoil, and `drop_ball()` relocation.
- Upward throws now reuse the generic `toss_up()` falling-object path for the live ball, including the C-shaped roof roll, contact break-test, weight damage, floor hit, and floor break-test ordering.

## Tests

- `downward attached hero-thrown heavy iron ball stays attached and hits floor at hero`
- `upward attached hero-thrown heavy iron ball stays attached after falling back`
- Focused verification: `node --test --test-name-pattern "attached hero-thrown heavy iron ball|attached ball throw" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Vertical soft terrain, liquid, stairs/ladder, and hole/trapdoor landing effects still need dedicated canaries because C reaches `hitfloor()`/`dropz()` instead of the horizontal `"fall"` floor-effects path.
- Buried-ball conversion remains open.
- The remaining audit 649 follow-ups still apply: mounted bear-trap wording, blind glyph ordering, `spoteffects(TRUE)`, and pool/pit/hole monster or levitation edge cases.
