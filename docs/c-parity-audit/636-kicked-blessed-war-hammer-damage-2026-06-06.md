# Kicked Blessed War Hammer Damage

## C anchors

- `nethack-c/upstream/include/objects.h:114` through `:118` and `nethack-c/upstream/include/objclass.h:96` through `:100`: the weapon table maps small/large damage and hit bonus into `oc_wsdam`, `oc_wldam`, and `oc_hitbon`.
- `nethack-c/upstream/include/objects.h:367` through `:369`: war hammer is a `P_HAMMER` iron weapon with small `d4`, large `d4`, and zero hit bonus.
- `nethack-c/upstream/src/weapon.c:149` through `:165` and `nethack-c/upstream/src/mondata.c:531` through `:542`: blessed weapons get `+2` to hit against vampshifters, undead, and demons.
- `nethack-c/upstream/src/dokick.c:733` through `:748` and `nethack-c/upstream/src/dothrow.c:2021` through `:2023`: kicked floor objects call `thitmonst()` as `HMON_KICKED`.
- `nethack-c/upstream/src/dothrow.c:2074` and `:2152` through `:2158`: kicked weapons still include `omon_adj()`/`hitval()` in the hit calculation, then apply the kicked non-ammo `-3` hit adjustment.
- `nethack-c/upstream/src/weapon.c:263` through `:275`: small-target `dmgval()` rolls `rnd(4)` for war hammer and then applies the `WAR_HAMMER` `+1` small-target switch bonus.
- `nethack-c/upstream/src/weapon.c:322` through `:328`: after base weapon damage, blessed weapons against blessing-haters add `rnd(4)`.
- `nethack-c/upstream/src/uhitm.c:942` through `:944` and `:1436` through `:1506`: `hmon()` applies `dmgval()` before damage-increase, strength, and weapon-skill damage recalculation.
- `nethack-c/upstream/src/dokick.c:771` through `:785`: surviving kicked objects land via `flooreffects()`, `place_object()`, and stacking.
- `nethack-c/upstream/src/dothrow.c:1780` through `:1804`, `:2581` through `:2583`, and `nethack-c/upstream/src/zap.c:1469`: direct thrown hard-floor landing can call `breaktest()`/`obj_resists()` and consume `rn2(100)`; the kicked landing tail does not.

## JS parity

- `HERO_THROWN_WEAPON_MONSTER_DATA` already models war hammer with `smallDie: 4`, `smallAdd: 1`, `largeDie: 4`, zero hit bonus, and `P_HAMMER`.
- `heroProjectileWeaponDamage()` rolls base damage, applies `smallAdd`, then C-order blessed/silver special damage before erosion, damage-increase, strength, and weapon skill.
- `kickFloorObjectToward()` uses the kicked weapon hit adjustment and lands surviving monster-hit weapons through `placeKickedFloorObject()`, not the direct thrown hard-floor break path.

## Replay-free coverage

- `command kicked blessed war hammer uses small-add and blessed damage without hard-landing break roll`

The canary drives the real kick command with deterministic unit RNG only. It asserts floor-object kick/hit wording, C-order `rnd(4)` base damage, flat `+1`, blessed `rnd(4)`, HP loss from the logged rolls, retained blessed state, landing coordinates, and the exact `rnd(20)`, `rnd(4)`, `rnd(4)`, `rn2(19)` sequence with no direct-thrown hard-floor `rn2(100)`.

## Remaining candidates

- Wielded/returning aklys is covered separately in audit 637.
- Direct thrown blessed war hammer can be added later if a landing-tail regression requires a direct/kicked contrast for this exact object.
