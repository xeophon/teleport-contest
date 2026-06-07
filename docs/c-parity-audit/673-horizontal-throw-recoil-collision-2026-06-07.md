# 673 - Horizontal Throw Recoil Collision

## C Source

- `nethack-c/upstream/src/dothrow.c:1650-1680` splits ordinary horizontal throw range, runs projectile flight, then applies air/levitation recoil.
- `nethack-c/upstream/src/dothrow.c:1078-1125` prints the initial `float`/`hurtle` recoil message and delegates each recoil square to `hurtle_step()`.
- `nethack-c/upstream/src/dothrow.c:784-837` handles invalid squares, obstructed terrain, closed doors, diagonal open door frames, iron bars, and boulders. Obstacle collisions use `rnd(2 + *range)`, `Maybe_Half_Phys()`, `losehp()`, and `wake_nearto(x, y, 10)`.
- `nethack-c/upstream/src/dothrow.c:842-881` handles monster recoil bumps by waking/unhiding the monster, making it angry, and waking nearby monsters without object or monster damage.

## Port Notes

- `heroHorizontalThrowRecoil()` now distinguishes obstacle, boulder, iron-bar, open-door-frame, invalid-square, and monster collision branches instead of silently stopping.
- Obstacle and boulder collisions return the C-style recoil-plus-collision message, keep the hero on the pre-collision square, apply `rnd(2 + remainingRange)` through `maybeHalfPhysicalDamage()`, and wake nearby monsters.
- Monster recoil bumps now wake and anger the bumped monster, clear its waiting/eating state through the existing thrown-object anger helper, wake nearby monsters, and do not damage the hero or monster.
- The existing ordinary throw ordering is preserved: projectile flight resolves first, recoil collision side effects happen next, and the hard landing break roll still follows recoil.

## Tests

- `levitating hero-thrown ordinary weapon recoils after C split range flight`
- `levitating hero-thrown ordinary weapon recoil bumps boulder with C damage and wake`
- `levitating hero-thrown ordinary weapon recoil bumps monster without damage`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "levitating hero-thrown ordinary weapon recoils after C split range flight|levitating hero-thrown ordinary weapon recoil bumps boulder|levitating hero-thrown ordinary weapon recoil bumps monster|levitating hero-thrown loose heavy iron ball uses C ball range divisor|levitating hero-thrown arrow with matching bow uses C ammo range increment" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Recoil trap handling remains separate. C only fires a narrow subset of traps during recoil and otherwise reports seen traps as being passed over, so this should not reuse the full movement trap dispatcher wholesale.
- Monster collision wording is still simplified for invisible, mimics, and hidden glyph cases.
- Petrification from bodily monster collision, passwall/no-pass edge cases, diagonal crevice wedging, Sokoban jump stops, shop/room transitions, terrain switching, and fatal/lifesaving/polyself handoff remain separate recoil parity slices.
