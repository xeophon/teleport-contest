# 741 - Hero Projectile Wielded Bow Glove Hit Penalty

## C Source

- `nethack-c/upstream/src/dothrow.c:2004-2013` defines `thitmonst()` for hero-thrown objects, kicked objects, and applied polearms/grapnels.
- `nethack-c/upstream/src/dothrow.c:2056-2072` applies the glove penalty before kicked/ammo-specific adjustments whenever the hero has worn gloves and `uwep` is a bow.
- `nethack-c/upstream/src/dothrow.c:2154-2164` later applies kicked-object penalties or unmatched/matched ammo adjustments, so the bow-glove penalty is not limited to matching bow ammo.
- `nethack-c/upstream/src/dokick.c:736-748` routes kicked floor objects that hit monsters through `thitmonst()`.
- `nethack-c/upstream/src/apply.c:3521` and `:3848` route applied polearm/grapnel impacts through `thitmonst()` with `uwep`.

## Port Notes

- Replaced the matching-launcher-only helper with `heroWieldedBowGloveHitPenalty()`.
- `heroProjectileBaseHitValue()` now includes the worn-glove bow penalty, matching C's placement before the thrown, kicked, and ammo-specific hit adjustments.
- `heroFiredLauncherAmmoHitValue()` passes the selected launcher into the base helper so fireassist shots still model C's wield-before-throw behavior.
- The penalty remains bow-only: gauntlets of power subtract 2, gauntlets of fumbling subtract 3, and crossbows/leather gloves/non-glove fumbling do not add a direct to-hit penalty.

## Tests

- `hero-thrown dart uses C wielded bow glove hit penalty`
- `hero-thrown unmatched crossbow bolt uses wielded bow glove hit penalty by hand`
- `command kicked dagger uses C wielded bow glove hit penalty`
- Existing launcher-ammo glove tests from audit 740 were rerun with the generalized helper.

## Remaining

- Special thrown objects such as potions, eggs, venom, and cream pies still use their own C hit gates rather than the weapon/gem/ammo hit helpers.
- Applied polearm coverage continues to live in the polearm audit series; ordinary applied polearms wield themselves, so this bow-specific helper normally contributes zero there.
