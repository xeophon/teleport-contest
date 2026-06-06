# 642 - Horizontal Throw Air Recoil

## C Source

- `nethack-c/upstream/src/dothrow.c:1601-1604` makes non-underwater hero-thrown boomerangs recoil first on air levels or while levitating, then runs `boomhit()` from the updated hero position.
- `nethack-c/upstream/src/dothrow.c:1613-1648` computes ordinary horizontal throw range from crossbow state, strength, object weight, ball handling, and ammo/launcher state.
- `nethack-c/upstream/src/dothrow.c:1650-1658` splits air/levitation reaction distance out of the ordinary projectile range: `urange -= range`, minimum one, then `range -= urange`, minimum one.
- `nethack-c/upstream/src/dothrow.c:1660-1672` applies special projectile range caps after that split, including boulders, Mjollnir, tethered aklys, buried ball, and underwater range one.
- `nethack-c/upstream/src/dothrow.c:1674-1682` runs ordinary `bhit()` with the post-split range, then calls `hurtle(-u.dx, -u.dy, urange, TRUE)` afterward so recoil uses the post-flight hero location.
- `nethack-c/upstream/src/dothrow.c:1078-1125` implements `hurtle()`: trapped or punished heroes stop with anchoring/tug messages, clear movement prints "float" for range one and "hurtle" for longer ranges, and `walk_path()` delegates each square to `hurtle_step()`.
- `nethack-c/upstream/src/dothrow.c:773-970` shows `hurtle_step()` is much broader than the current JS slice: invalid/out-of-region stops, wall/door/boulder/iron-bars collision damage, monster wake/anger handling, room/shop transitions, pool/lava messages, and trap effects.

## Port Notes

- JS now detects air-level or levitation horizontal throws with `heroHorizontalThrowAirRecoilActive()`.
- Non-underwater boomerangs now recoil one square before curved flight is computed, so the boomerang path starts from the updated hero position just like C.
- Ordinary horizontal weapon throws now use the C strength/weight split for the projectile range and recoil range on air/levitation paths, then recoil after projectile flight.
- Clear recoil movement updates hero previous/current coordinates, marks movement, refreshes old/new squares, and defers vision recomputation when the test map's `level.at()` cells are stateless.
- Clear recoil does not consume RNG, matching C for unobstructed movement.

## Tests

- `levitating hero-thrown boomerang recoils before curved flight hits target`
- `levitating hero-thrown ordinary weapon recoils after C split range flight`
- Focused verification: `node --test --test-name-pattern "levitating hero-thrown ordinary weapon recoils after C split range flight|levitating hero-thrown boomerang recoils before curved flight hits target" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Full `hurtle_step()` parity for collisions, traps, punishment, pools/lava, shop/room transitions, and floor effects.
- Early-return horizontal hit branches for venom, cream pies, eggs, and potions should prepend recoil messages before returning.
- Crossbow/launcher ammo, multishot, Mjollnir, heavy iron ball, and full ball-and-chain range details remain outside this focused clear-floor slice.
