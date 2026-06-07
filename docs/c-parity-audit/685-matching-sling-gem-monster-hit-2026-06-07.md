# 685 - Matching Sling Gem Monster Hit

## C Source

- `nethack-c/upstream/include/obj.h:238-246` classifies `GEM_CLASS` objects with launcher skills as ammo and matches them to launchers by opposite skill.
- `nethack-c/upstream/include/objects.h:1515-1525` gives gems and rocks `-P_SLING` ammo skill; ordinary gems use `1d3/1d3`.
- `nethack-c/upstream/include/objects.h:1598-1607` gives gray stones and rocks their sling damage rows: most are `1d3/1d3`, flint is `1d6/1d6`.
- `nethack-c/upstream/src/dothrow.c:163-168` enables multishot only when ammo matches the wielded launcher.
- `nethack-c/upstream/src/dothrow.c:1635-1640` grants matching launcher ammo the extra range increment.
- `nethack-c/upstream/src/dothrow.c:2082-2099` skips unicorn gem gift/catch while `uslinging()` is true.
- `nethack-c/upstream/src/dothrow.c:2152-2164` adds matching launcher enchantment, erosion, and hit bonus instead of the unmatched-ammo penalty.
- `nethack-c/upstream/src/uhitm.c:1396-1404` makes thrown stone missiles do no harm to rock-passers while still counting as hits.
- `nethack-c/upstream/src/uhitm.c:1436-1487` applies increase-damage and weapon skill damage to matched launcher ammo while suppressing strength damage.

## Port Notes

- Matching sling ammo now participates in the shared launcher-ammo monster impact path for both `f` and direct `t`.
- Gem-class sling ammo uses object-row damage: `rnd(3)` for ordinary gems, rocks, and gray stones; `rnd(6)` for flint.
- Matching sling attacks use sling hit and damage skill bonuses, plus launcher enchantment/hit bonuses, and continue to suppress strength damage.
- Direct `t` now routes matching launcher ammo before generic unicorn/gem behavior, matching C's `!uslinging()` unicorn guard.
- Slung stone missiles that hit xorns or earth elementals now wake/anger the monster, exercise Dexterity, can mulch, and land without dealing damage.

## Tests

- `f command slung glass gem hits monster through launcher path`
- `hero-thrown glass gem with matching sling attacks unicorn instead of gift`
- `f command slung flint to rock-passer does no harm without damage roll`

## Remaining Follow-Ups

- Object/furniture mimic reveal is covered by audit 738, and poisoned ammo effects are covered by audits 687 and 739. Lethal projectile cleanup remains a separate `thitmonst()`/`hmon()` slice.
