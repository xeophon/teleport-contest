# 740 - Hero Launcher Bow Glove Hit Penalty

## C Source

- `nethack-c/upstream/src/dothrow.c:2036-2055` builds the hero projectile hit value from luck, target AC, hit bonuses, level, Dexterity, and distance.
- `nethack-c/upstream/src/dothrow.c:2056-2072` applies the worn-glove bow penalty when `uarmg`, `uwep`, and `objects[uwep->otyp].oc_skill == P_BOW`: gauntlets of power subtract 2, gauntlets of fumbling subtract 3, leather gloves and gauntlets of dexterity subtract 0.
- `nethack-c/upstream/src/dothrow.c:2152-2164` then rolls `rnd(20)` and adds matching-launcher enchantment, erosion, hit bonus, artifact bonus, and launcher skill adjustments.
- `nethack-c/upstream/src/dothrow.c:170-186` uses `Fumbling` for weak multishot gating, not as a direct to-hit penalty.
- `nethack-c/upstream/include/objects.h:395-402` gives bows `P_BOW` and crossbows `P_CROSSBOW`, so this glove branch does not affect crossbow shots.

## Port Notes

- Added `heroFiredLauncherBowGloveHitPenalty()` to the shared matching launcher-ammo hit calculation.
- Matching bow ammo now loses 2 to-hit with worn gauntlets of power and 3 to-hit with worn gauntlets of fumbling.
- Leather gloves, gauntlets of dexterity, generic hero fumbling, and matching crossbow shots keep their previous to-hit value.
- The helper is used by both direct `t` matching launcher ammo and the `f` command because both paths route through `heroFiredLauncherAmmoHitValue()`.

## Tests

- `hero-thrown matching bow arrow uses C glove-specific hit penalties`
- `hero-thrown matching crossbow bolt ignores bow glove hit penalties`
- `f command gauntlets of power penalize matching bow arrow hit`
- `f command gauntlets of fumbling apply stronger bow arrow hit penalty`
- `f command gauntlets of power do not penalize matching crossbow bolt hit`

## Remaining

- C's `thitmonst()` gate keys off the wielded bow before matching-launcher bonus handling; this slice covers the normal matching launcher-ammo path that the current JS helper owns.
- Gauntlets of dexterity's indirect Dexterity stat effect is separate from this direct glove penalty and remains governed by broader worn-armor attribute handling.
