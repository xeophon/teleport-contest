# Kicked Special Weapon Damage Landing

## C anchors

- `nethack-c/upstream/src/dokick.c:733` through `:748`: kicking a floor object extracts it, sends it through `bhit(..., KICKED_WEAPON, ...)`, and calls `thitmonst()` when it hits a monster.
- `nethack-c/upstream/src/dothrow.c:2021` through `:2023`: `thitmonst()` classifies the kicked object as `HMON_KICKED`.
- `nethack-c/upstream/src/dothrow.c:2074` and `nethack-c/upstream/src/weapon.c:149` through `:165`: kicked weapon hit chance still uses `omon_adj()`/`hitval()`, including blessed `+2` to-hit against blessing-haters.
- `nethack-c/upstream/src/dothrow.c:2152` through `:2158`: kicked weapons roll `rnd(20)` and then apply the kicked non-ammo `-3` hit adjustment, not the direct-thrown `+2` adjustment.
- `nethack-c/upstream/src/weapon.c:263` through `:344`: `dmgval()` rolls base weapon damage, then blessed `rnd(4)`, silver `rnd(20)`, and erosion in C order.
- `nethack-c/upstream/src/uhitm.c:1642` through `:1648`, `:1663` through `:1692`, and `:1877` through `:1878`: hit text is emitted before visible silver searing text.
- `nethack-c/upstream/src/dothrow.c:2205` through `:2228` and `nethack-c/upstream/src/dokick.c:771` through `:785`: after a surviving kicked weapon hit, C exercises Dexterity, runs passive object handling, then enters the kicked-object landing tail with `flooreffects()`/`place_object()`/stacking. This branch does not call direct-thrown `breaktest()` on hard floor, so there is no hard-landing `rn2(100)` break probe for ordinary surviving kicked weapons.

## JS parity

- The current `heroKickedWeaponImpact()` path already shares C-order `dmgval()`-style special damage with direct hero projectiles for supported weapon rows.
- `kickFloorObjectToward()` lands surviving monster-hit kicked weapons through `placeKickedFloorObject()`, which runs passive-object and floor-effect placement without the generic direct-thrown hard-floor break probe.
- Existing ordinary kicked spear and war hammer canaries now assert exact RNG logs, pinning the absence of a hard-landing `rn2(100)` after Dexterity exercise.

## Replay-free coverage

- `command kicked spear harms ordinary monster and survives landing`
- `command kicked war hammer harms ordinary monster and survives landing`
- `command kicked blessed silver spear uses target-form bonuses without hard-landing break roll`

The tests drive the real kick command with deterministic unit RNG only. They assert kick text, hit text, C-order base/blessed/silver damage rolls, visible silver searing text, HP loss derived from logged RNG, floor-object landing coordinates, retained BUC/material state, and exact hit/damage/Dexterity RNG sequences with no direct-thrown hard-landing break roll.

## Remaining candidates

- Kicked aklys canaries can pin the same kicked landing tail with the aklys `P_CLUB` object row.
- Wielded/returning aklys remains separate because C routes it through `AutoReturn()` and tethered weapon state.
- Blessed war hammer against a demon or undead target can separately pin the small-target `+1` plus blessed `rnd(4)` combination.
