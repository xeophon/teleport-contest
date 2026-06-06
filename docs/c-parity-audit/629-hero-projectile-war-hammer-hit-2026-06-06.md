# Hero Projectile War Hammer Hit

## C anchors

- `nethack-c/upstream/src/dothrow.c:1477` through `:1495`: direct hero-thrown objects that reach a monster route into `thitmonst()`.
- `nethack-c/upstream/src/dothrow.c:1428` through `:1437`: `throwing_weapon()` explicitly includes `WAR_HAMMER`, so a plain war hammer is meant to be thrown.
- `nethack-c/upstream/src/dothrow.c:2152` through `:2188`: weapon hits roll `rnd(20)`; thrown non-ammo weapons get the meant-to-be-thrown `+2` adjustment and weapon hit bonus.
- `nethack-c/upstream/include/objects.h:367` through `:368`: ordinary war hammer has `d4` small-target and large-target dice, `oc_hitbon=0`, `P_HAMMER`, and iron material.
- `nethack-c/upstream/src/weapon.c:216` through `:285`: `dmgval()` adds `+1` for `WAR_HAMMER` only against non-big targets, giving `rnd(4)+1` small-target damage and `rnd(4)` large-target damage.
- `nethack-c/upstream/src/uhitm.c:1075` and `:1436` through `:1505`: thrown war hammer hits use ordinary weapon damage, then strength, damage-increase, and `P_HAMMER` weapon-skill damage apply.
- `nethack-c/upstream/src/dothrow.c:1976` through `:1992` and `:2193` through `:2228`: war hammer is not missile ammo, so successful hits skip hit-only missile mulch, exercise Dexterity, run passive-object handling, and then return to the landing tail.

## JS parity

- Direct hero-thrown singleton plain non-artifact war hammers now use the shared hero projectile weapon path.
- The direct-hit weapon metadata includes `P_HAMMER`, the thrown-weapon hit adjustment, `d4+1` small-target damage, and `d4` large-target damage.
- Shared weapon damage now accepts C-style additive damage fields, preserving the existing enchantment, erosion, strength, damage-increase, and skill-damage ordering.
- Artifact and return/tether behavior remains outside this slice: Mjollnir and wielded aklys still need separate C-backed coverage.

## Replay-free coverage

- `hero-thrown war hammer harms ordinary monster with hammer skill damage`

The test drives the real `throw` command path with deterministic unit RNG only. It asserts hit wording, exact HP loss from `rnd(4)+1`, strength, damage increase, and skilled `P_HAMMER` damage, wake/anger cleanup, inventory removal, landing coordinates, and RNG label order without missile-mulch rolls.

## Remaining candidates

- Direct hero-thrown spear variants (`elven spear`, `orcish spear`, `dwarvish spear`, `silver spear`) can reuse the same path with separate dice/material metadata.
- Non-wielded aklys is possible, but should stay separate from wielded aklys return behavior.
- Broader weapon skill to-hit parity for thrown weapons should be audited independently because the current narrow path already forces deterministic hits through existing hit inputs.
