# Hero Projectile Spear And Javelin Hit

## C anchors

- `nethack-c/upstream/src/dothrow.c:1477` through `:1495`: direct hero-thrown objects that reach a monster route into `thitmonst()`.
- `nethack-c/upstream/src/dothrow.c:2010` through `:2078`: thrown/kicked hit-value setup includes Luck, target AC, hit increase, level, Dexterity, range, and `omon_adj()`.
- `nethack-c/upstream/src/dothrow.c:1428` through `:1437`: `throwing_weapon()` includes `is_spear()`, so spears and javelins are meant-to-be-thrown weapons.
- `nethack-c/upstream/src/dothrow.c:2152` through `:2188`: weapon hits roll `rnd(20)`; thrown non-ammo weapons get the meant-to-be-thrown `+2` adjustment and weapon hit bonus.
- `nethack-c/upstream/include/objects.h:170` through `:191`: ordinary spear uses `d6` small-target and `d8` large-target damage; javelin uses `d6`/`d6`; both use `P_SPEAR`.
- `nethack-c/upstream/src/uhitm.c:934` through `:944`: thrown spear/javelin route through ordinary weapon damage rather than the launcher-ammo ranged fallback.
- `nethack-c/upstream/src/uhitm.c:1436` through `:1505`: strength, damage increase, and `P_SPEAR` weapon-skill damage apply.
- `nethack-c/upstream/src/dothrow.c:1976` through `:1992` and `:2200` through `:2228`: spear and javelin are not missile mulch candidates; after `hmon()`, C exercises Dexterity, skips mulch, runs `passive_obj()`, then returns to landing.

## JS parity

- Direct hero-thrown singleton ordinary spears and javelins now use the shared hero projectile weapon path.
- Spear projectile damage uses C object metadata shape: `d6` versus small targets, `d8` versus large targets, and `P_SPEAR` skill damage.
- Javelin projectile damage uses `d6` versus both small and large targets with `P_SPEAR` skill damage.
- Both remain thrown non-ammo weapons: they get the thrown-weapon hit adjustment, strength and damage-increase bonuses, and passive-object-before-landing handling, but they do not run hit-only missile mulch.

## Replay-free coverage

- `hero-thrown spear harms ordinary monster with spear skill damage`
- `hero-thrown javelin harms ordinary monster with spear skill damage`

The tests drive the real `throw` command path with deterministic unit RNG only. They assert hit wording, exact HP loss with expert `P_SPEAR` skill damage, wake/anger cleanup, inventory removal, landing coordinates, and RNG label order.

## Remaining candidates

- Spear variants (`elven spear`, `orcish spear`, `dwarvish spear`, `silver spear`) need separate metadata-backed direct-hit slices because their dice, material, appearances, and silver/blessed interactions differ.
- Plain non-artifact war hammer is a small adjacent thrown-weapon candidate; Mjollnir and wielded aklys should stay separate because C has return/tether behavior.
- Kicked dart/shuriken/spear canaries can lock the corrected non-ammo kicked adjustment, but current audits did not find a behavior gap for kicked singleton dart or shuriken.
