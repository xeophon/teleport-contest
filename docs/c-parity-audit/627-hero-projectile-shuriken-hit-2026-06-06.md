# Hero Projectile Shuriken Hit

## C anchors

- `nethack-c/upstream/src/dothrow.c:1477` through `:1495`: direct hero-thrown objects that reach a monster route into `thitmonst()`.
- `nethack-c/upstream/include/objects.h:163` through `:168`: shuriken are iron missile weapons with `d8` small-target damage, `d6` large-target damage, `oc_hitbon=2`, and `-P_SHURIKEN`; boomerangs are adjacent but have separate return behavior.
- `nethack-c/upstream/include/obj.h:238` through `:266`: shuriken are missiles rather than launcher ammo.
- `nethack-c/upstream/src/dothrow.c:2152` through `:2188`: weapon hits roll `rnd(20)`; non-ammo throwing weapons use the thrown-weapon hit adjustment and `weapon_hit_bonus()`.
- `nethack-c/upstream/src/uhitm.c:1070` through `:1090`: thrown shuriken use ordinary weapon damage rather than the launcher-ammo ranged fallback.
- `nethack-c/upstream/src/uhitm.c:1436` through `:1505`: strength, damage increase, and `P_SHURIKEN` skill damage apply for thrown shuriken.
- `nethack-c/upstream/src/dothrow.c:2200` through `:2228`: after `hmon()`, C exercises Dexterity, checks hit-only mulch, runs `passive_obj()`, then returns to landing.

## JS parity

- Direct hero-thrown singleton shuriken now use the shared hero projectile weapon path.
- Shuriken projectile damage uses C object metadata shape: `d8` versus small targets, `d6` versus large targets, `oc_hitbon=2`, and `P_SHURIKEN` skill bonus lookup.
- Shuriken remain missile/throwing-weapon hits, not launcher-ammo hits. They receive the normal thrown-weapon hit adjustment and strength/damage-increase/skill damage path.
- Boomerangs intentionally remain outside this slice because C routes them through `boomhit()` return/self-hit/landing handling instead of the straight `thitmonst()` projectile path.

## Replay-free coverage

- `hero-thrown shuriken harms ordinary monster and survives landing`

The test drives the real `throw` command path with deterministic unit RNG only. It asserts hit wording, exact HP loss with the `P_SHURIKEN` skill bonus, wake/anger cleanup, inventory removal, landing coordinates, and RNG label order.

## Remaining candidates

- Kicked dart/shuriken canaries can lock the corrected non-ammo kicked adjustment, but kicked singleton dart has no current behavior gap after audit 626.
- Boomerang needs its own slice for curved flight, possible self-catch/self-hit, sink and obstacle messages, and non-mulch return/landing behavior.
- Poisoned shuriken/dart direct hit ordering, alignment penalties, unpoison messages, and deadly poison cleanup should stay separate from this non-poisoned shuriken slice.
