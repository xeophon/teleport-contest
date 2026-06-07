# 651 - Mounted Attached Ball Bear Trap Pull-Out

## C Source

- `nethack-c/upstream/src/ball.c:891-896` enters attached-ball relocation only when the ball lands away from the hero and excludes `TT_INFLOOR`/`TT_BURIEDBALL`.
- `nethack-c/upstream/src/ball.c:911-920` handles bear-trap pull-out by rolling `rn2(3)` for side, printing the pull-out line, calling `set_wounded_legs(side, rn1(1000,500))`, then skipping the severe-leg message and `losehp()` when `u.usteed` is set.
- `nethack-c/upstream/src/ball.c:925-952` clears the hero trap state, moves the hero behind or onto the ball according to the landing square rules, and then moves the chain to the hero.
- `nethack-c/upstream/src/dungeon.c:1583` is the usual mounted-position sync helper, but `drop_ball()` assigns `u.ux/u.uy` directly and does not call it.

## Port Notes

- The existing bear-trap pull-out branch already skipped the unmounted HP loss and severe-leg wording while still applying the wounded-leg timer.
- The mounted canary records the C direct-coordinate caveat: the hero and chain relocate, while the stored mounted monster coordinates are not synchronized by this `drop_ball()` path.

## Tests

- `mounted attached ball throw pulls hero out of bear trap without HP loss`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern "attached ball throw pulls hero out of bear trap|mounted attached ball throw" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Blind ball/chain glyph ordering and `spoteffects(TRUE)` after hero relocation remain open.
- Pit/hole landing with a monster on the ball square, levitating pool/pit/hole landing, and dedicated hole/trapdoor landing canaries remain open.
