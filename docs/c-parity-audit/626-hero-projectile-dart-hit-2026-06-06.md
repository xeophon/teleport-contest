# Hero Projectile Dart Hit

## C anchors

- `nethack-c/upstream/src/dothrow.c:1477` through `:1495`: direct hero-thrown objects that reach a monster route into `thitmonst()`.
- `nethack-c/upstream/src/dothrow.c:2152` through `:2188`: weapon, weptool, and gem hits roll `rnd(20)`; non-ammo throwing weapons use the thrown-weapon hit adjustment before `hmon()`.
- `nethack-c/upstream/include/obj.h:238` through `:246`: launcher ammo is limited to bow/crossbow/sling ammunition; darts are missiles rather than launcher ammo.
- `nethack-c/upstream/include/objects.h:160` through `:164`: dart metadata uses `d3` small-target and `d2` large-target damage under `P_DART`.
- `nethack-c/upstream/src/uhitm.c:1070` through `:1090`: thrown darts use ordinary weapon damage rather than the launcher-ammo ranged fallback.
- `nethack-c/upstream/src/uhitm.c:1436` through `:1505`: damage bonus and weapon-skill bonus apply for thrown darts; launcher strength suppression only applies when ammo is fired from a matching launcher.
- `nethack-c/upstream/src/dothrow.c:2200` through `:2228`: after `hmon()`, C exercises Dexterity, checks hit-only mulch, runs `passive_obj()`, then returns to landing.

## JS parity

- Direct hero-thrown singleton darts now use the shared hero projectile weapon path instead of falling through to generic miss handling.
- Dart projectile damage uses C object metadata shape: `d3` versus small targets, `d2` versus large targets, and `P_DART` skill bonus lookup.
- Darts remain hit-only mulch candidates, so the order is hit message, damage/wakeup, Dexterity exercise, mulch roll, passive-object follow-up, and landing.
- Kicked projectile ammo classification no longer treats darts as launcher ammo; darts are missiles in C. A dedicated kicked-dart canary remains separate from this direct-throw slice.

## Replay-free coverage

- `hero-thrown dart harms ordinary monster and survives landing`

The test drives the real `throw` command path with deterministic unit RNG only. It asserts hit wording, exact HP loss with the `P_DART` skill bonus, wake/anger cleanup, inventory removal, landing coordinates, and RNG label order.

## Remaining candidates

- Kicked dart hits now share the corrected missile classification but still need their own canary.
- Shuriken and boomerang direct projectile hits should be added as separate missile slices.
- Bow/crossbow/sling launcher ammo and hand-thrown launcher ammo should remain separate because C has distinct hit and strength/skill handling for matching launchers.
- Poisoned dart hit ordering, alignment penalties, unpoison messages, and deadly poison cleanup should stay separate from this non-poisoned dart slice.
