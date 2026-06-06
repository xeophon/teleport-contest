# 644 - Horizontal Throw Heavy Iron Ball Range

## C Source

- `nethack-c/upstream/src/dothrow.c:1613-1616` sets horizontal throw base range to strength/2 unless the throw is a crossbow shot.
- `nethack-c/upstream/src/dothrow.c:1622-1625` subtracts `obj->owt / 100` for `HEAVY_IRON_BALL`, while other objects use `obj->owt / 40`.
- `nethack-c/upstream/src/dothrow.c:1632-1633` clamps the pre-air projectile range to at least one.
- `nethack-c/upstream/src/dothrow.c:1650-1658` splits the range on the Plane of Air or while levitating: the hero recoil range becomes the base range minus projectile range, then the projectile range is reduced by that recoil range, with both sides clamped to at least one.
- `nethack-c/upstream/include/objects.h:1624-1627` defines the heavy iron ball object with weight 480.

## Port Notes

- `OBJECT_WEIGHTS` now includes `heavy iron ball` at `WT_IRON_BALL_BASE` so kind-only loose ball fixtures use the C object weight when `owt` is absent.
- `heroHorizontalThrowAirSplitRange()` now detects heavy iron balls by `otyp` or canonical kind and uses the C `/100` divisor for both loose and attached balls.
- The prior JS helper only used the ball divisor when `obj === game.u.uball`, which left loose heavy iron balls using the generic `/40` branch and changed levitation recoil distance.

## Tests

- `levitating hero-thrown loose heavy iron ball uses C ball range divisor`
- Focused verification: `node --test --test-name-pattern='levitating hero-thrown loose heavy iron ball uses C ball range divisor' test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Full `hurtle_step()` parity for collision, trap, pool/lava, room/shop, and punishment fallout is still outside this range-divisor slice.
- Crossbow/launcher ammo, multishot, Mjollnir, and full ball-and-chain range details remain outside this focused clear-floor slice.
