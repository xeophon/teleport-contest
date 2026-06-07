# Hero Thrown Dagger And Knife Variants

## C Source

- `nethack-c/upstream/include/objects.h:200-233` defines the dagger and knife family object rows, including small/large damage dice, object hit bonus, skill, material, and stackability.
- `nethack-c/upstream/src/dothrow.c:1428` and `nethack-c/upstream/src/dothrow.c:2181-2190` add a thrown-weapon adjustment: piercing non-sword blades get `+2`, while non-piercing thrown weapons get `-2`.
- `nethack-c/upstream/src/weapon.c:149` applies object hit bonus and enchantment through `hitval()`.
- `nethack-c/upstream/src/weapon.c:216` and `nethack-c/upstream/src/uhitm.c:1435-1506` apply base weapon damage, silver/blessing bonuses, erosion, strength/damage bonuses, and weapon-skill damage.

## JS Gap

Direct hero-thrown weapon impacts only had monster metadata for plain dagger and plain knife. Variants such as silver dagger and stiletto already had upward/kicked fixture coverage, but direct `t` monster impacts did not enter the weapon-impact path for those names.

## Change

- Added `HERO_THROWN_WEAPON_MONSTER_DATA` entries for elven dagger, orcish dagger, silver dagger, athame, scalpel, stiletto, worm tooth, and crysknife.
- Added those names to the supported stackable multishot set.
- Split object hit bonus from thrown-weapon adjustment with a `thrownHitAdj` override for non-piercing athame, scalpel, and worm tooth.
- Kept silver and blessing target-form damage on the shared projectile special-damage path.

## Coverage

- `hero-thrown silver dagger sears silver-hating monster and survives landing`
- `hero-thrown stiletto uses knife-family monster impact and survives landing`

## Remaining

- Artifact dagger/knife behavior remains excluded by the current artifact guard and needs a separate source-backed slice.
- Ordinary poisoned coating does not apply to these positive-skill weapon families in C; permanent artifact poison, such as Grimtooth, remains separate.
- Additional direct regressions for elven/orcish dagger, athame, scalpel, worm tooth, and crysknife would improve fixture coverage.
