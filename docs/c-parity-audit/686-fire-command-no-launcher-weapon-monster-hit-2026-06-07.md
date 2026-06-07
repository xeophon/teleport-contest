# 686 - Fire Command No-Launcher Weapon Monster Hit

## C Source

- `nethack-c/upstream/src/dothrow.c:467-582` routes `f` through `dofire()` and then `throw_obj()` even when no launcher is found.
- `nethack-c/upstream/src/dothrow.c:1492` sends projectile monster contact into `thitmonst()`.
- `nethack-c/upstream/src/dothrow.c:2036-2068` computes thrown-object hit chance without a strength to-hit bonus, including Luck, monster AC, level, Dexterity, distance, and object adjustment.
- `nethack-c/upstream/src/uhitm.c:1075-1092` sends thrown missiles such as darts through ordinary weapon damage rather than the launcher-ammo fallback.
- `nethack-c/upstream/src/uhitm.c:1436-1494` applies increase-damage, strength, and weapon skill damage to ordinary thrown weapons and missiles.
- `nethack-c/upstream/src/dothrow.c:2206-2225` exercises Dexterity and runs hit-only missile mulch before the surviving projectile lands.
- `nethack-c/upstream/src/uhitm.c:1048-1061` marks poisoned thrown missiles as poisoned hits; poisoned-dart side effects remain outside this non-poisoned slice.

## Port Notes

- `fireDirection` now treats no-launcher supported weapon projectiles as monster impact targets instead of only landing them on the monster square.
- No-launcher weapon impacts reuse the direct-throw `heroThrownWeaponImpact()` path, preserving C-style hit rolls, damage dice, skill/strength bonuses, wake/anger effects, kill cleanup, hit-only mulch, passive-object landing state, and hard-landing rolls.
- Branch order stays constrained: launcher ammo remains first, by-hand bow/crossbow ammo stays on its dedicated path, and no-launcher unicorn/gem behavior still precedes generic weapon handling.

## Tests

- `f command no-launcher dart hits monster through thrown weapon path`
- `f command no-launcher dart miss wakes monster without damage roll`

## Remaining Follow-Ups

- Poisoned dart hit ordering, alignment penalties, unpoison messages, and deadly poison cleanup remain separate.
- Curved boomerang `f` flight, multishot non-launcher missiles, object/furniture mimic reveal, and broader passive-object fallout remain separate `throw_obj()` slices.
