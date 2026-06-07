# 671 - Horizontal Throw Unmatched Ammo Zero Range

## C Source

- `nethack-c/upstream/src/dothrow.c:1613-1633` computes the base weighted horizontal throw range and clamps it to at least one before ammo-specific adjustments.
- `nethack-c/upstream/src/dothrow.c:1635-1648` halves unmatched non-gem launcher ammo after that base clamp and does not clamp the result again.
- `nethack-c/upstream/src/dothrow.c:1650-1658` still clamps the air/levitation recoil split back to at least one, so the zero-range case is ordinary-ground unmatched ammo rather than air-level recoil.
- `nethack-c/upstream/src/zap.c:3851-3864` initializes `gb.bhitpos` to the hero square for thrown weapons, and `nethack-c/upstream/src/zap.c:3870` only advances while `range-- > 0`.

## Port Notes

- Horizontal throw final range normalization now preserves an explicit numeric zero instead of defaulting it through `range || 1`.
- Weak heroes throwing unmatched non-gem launcher ammo by hand can now produce C's zero-range flight: the projectile never enters the adjacent square, does not contact an adjacent monster, and lands on the hero square after the ordinary landing break check.
- The existing weighted-range helper still clamps the pre-ammo base range to at least one, so ordinary non-ammo throws and matched launcher ammo keep their prior minimum-one behavior.

## Tests

- `hero-thrown unmatched crossbow bolt uses C half range and warning`
- `weak hero-thrown unmatched crossbow bolt uses C zero range and warning`
- Focused verification: `node --test --test-reporter=spec --test-name-pattern "hero-thrown unmatched crossbow bolt uses C half range and warning|weak hero-thrown unmatched crossbow bolt uses C zero range and warning|hero-thrown heavy ordinary weapon uses C weight range on normal ground" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Audit 680 covers the separate `f` command path for launcher matching, range, by-hand unmatched ammo warning, zero-range, and air/levitation recoil.
- Broader `bhit()` details such as skiprange for thrown rocks and special projectile display cleanup remain separate source-backed slices.
