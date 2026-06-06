# Hero Projectile Special Weapon Damage

## C anchors

- `nethack-c/upstream/src/dothrow.c:2010` through `:2028`: direct hero-thrown objects are classified as `HMON_THROWN` before `thitmonst()` handles the monster hit.
- `nethack-c/upstream/src/dothrow.c:2152` through `:2187`: `thitmonst()` rolls `rnd(20)` for the hit check, applies `omon_adj()`/`hitval()` bonuses, and gives thrown weapons the normal thrown `+2` hit adjustment.
- `nethack-c/upstream/src/weapon.c:149` through `:164`: `hitval()` adds `+2` to hit for blessed weapons against monsters that hate blessings.
- `nethack-c/upstream/src/weapon.c:263` through `:344`: `dmgval()` rolls base weapon damage first, then blessed `rnd(4)` and silver `rnd(20)` target-form damage, then erosion.
- `nethack-c/upstream/src/uhitm.c:942` through `:944` and `:1436` through `:1505`: weapon hits use `dmgval()` and then add damage increase, strength damage, and weapon-skill damage without extra RNG.
- `nethack-c/upstream/src/uhitm.c:1663` through `:1691` and `:1877` through `:1878`: visible silver weapon hits emit the object-specific searing message after the ordinary hit message.
- `nethack-c/upstream/src/mondata.c:517` through `:543`: silver-haters and blessing-haters are the target-form predicates for these bonuses.

## JS parity

- `js/cmd.js` now applies the blessed weapon `+2` hit-value adjustment in the direct/kicked hero projectile hit-value helper.
- `heroProjectileWeaponDamage()` now follows C `dmgval()` order for supported direct/kicked weapon objects: base die, enchantment, blessed target-form damage, silver target-form damage, erosion, hero damage increase, strength, and skill damage.
- Direct visible silver weapon hits now use C's object-specific wording, such as `Your silver spear sears the vampire's flesh!`, instead of the monster-thrown generic searing wording.

## Replay-free coverage

- `hero-thrown silver spear sears silver-hating monster`
- `hero-thrown blessed spear uses blessing-hater hit and damage bonuses`

The tests drive the real throw command with deterministic unit RNG only. They assert hit text, special target-form damage rolls, HP loss derived from logged RNG, wakeup, landing coordinates, retained BUC/material state, and C RNG order.

## Remaining candidates

- Blessed war hammer against a demon or undead target can separately pin the C small-target `+1` plus blessed damage combination.
- Kicked silver/blessed weapon target-form bonuses should be covered with command-path canaries after direct coverage is stable.
- Non-wielded aklys target-form behavior still needs a separate source-backed slice.
