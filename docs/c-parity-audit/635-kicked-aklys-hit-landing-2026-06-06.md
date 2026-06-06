# Kicked Aklys Hit Landing

## C anchors

- `nethack-c/upstream/include/objects.h:381` through `:383`: aklys is a weapon-class object with small-target `d6`, large-target `d3`, zero hit bonus, `P_CLUB` skill, and iron material.
- `nethack-c/upstream/src/dokick.c:733` through `:748`: kicking a floor object extracts it, sends it through `bhit(..., KICKED_WEAPON, ...)`, and calls `thitmonst()` on monster contact.
- `nethack-c/upstream/src/dothrow.c:2021` through `:2023`: `thitmonst()` classifies `gk.kickedobj` as `HMON_KICKED`.
- `nethack-c/upstream/src/dothrow.c:2152` through `:2158`: kicked weapon hit chance rolls `rnd(20)` and applies the kicked non-ammo `-3` adjustment, separate from direct-thrown non-ammo `+2` plus throwing adjustments.
- `nethack-c/upstream/src/weapon.c:225` through `:227` and `:263` through `:265`: `dmgval()` rolls object-table large or small weapon damage, so aklys uses `rnd(3)` for large targets and `rnd(6)` otherwise.
- `nethack-c/upstream/src/uhitm.c:942` through `:944` and `:1473` through `:1506`: `hmon()` uses `dmgval()` and then applies strength/damage-increase plus the weapon damage skill bonus; aklys therefore uses the club skill for damage.
- `nethack-c/upstream/src/dothrow.c:30` through `:34`, `:1562` through `:1565`, `:1664` through `:1677`, and `:1708` through `:1725`: aklys return/tether behavior is inside `throwit()` and gated on primary-wielded `W_WEP`. Kicked floor objects do not enter that path.
- `nethack-c/upstream/src/dokick.c:752` through `:785`: after a surviving kicked object monster hit, C runs migration/shop handling, `flooreffects()`, and `place_object()`/stacking. This branch has no hard-floor `breaktest()`.
- `nethack-c/upstream/src/dothrow.c:1780` through `:1804`, `:2581` through `:2583`, and `nethack-c/upstream/src/zap.c:1469`: the hard-floor `breaktest()`/`obj_resists()` `rn2(100)` belongs to direct thrown landing, not the kicked landing tail.

## JS parity

- `HERO_THROWN_WEAPON_MONSTER_DATA` already contains aklys with C's `d6`/`d3`, zero hit bonus, and `P_CLUB` skill mapping.
- `heroKickedWeaponImpact()` shares the C-shaped weapon damage path for supported weapon rows while using the kicked hit adjustment.
- `kickFloorObjectToward()` lands surviving monster-hit floor objects through `placeKickedFloorObject()`, so kicked aklys does not run direct-thrown return/tether logic or the direct hard-floor break probe.

## Replay-free coverage

- `command kicked aklys harms ordinary monster with club skill damage`
- `command kicked aklys uses large-target damage die without returning`

The canaries drive the real kick command with deterministic unit RNG only. They assert kick and hit text, absence of return/tether/miss/catch/breakage text, HP loss derived from logged `rnd(6)` or `rnd(3)` plus expert club-skill damage, monster wake/flee-state cleanup, floor-object landing coordinates, retained stack count, and exact hit/damage/Dexterity RNG logs with no direct-thrown hard-floor `rn2(100)`.

## Remaining candidates

- Wielded/returning aklys remains separate because C routes it through `AutoReturn()` and tethered weapon state.
- Blessed war hammer against a demon or undead target can separately pin the small-target `+1` plus blessed `rnd(4)` combination.
