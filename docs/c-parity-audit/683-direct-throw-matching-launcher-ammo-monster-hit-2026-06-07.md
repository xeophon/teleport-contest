# 683 - Direct Throw Matching Launcher Ammo Monster Hit

## C Source

- `nethack-c/upstream/src/dothrow.c:87-270` handles ordinary `t` throws through `throw_obj()`, including ammo multishot when `matching_launcher(obj, uwep)` is true.
- `nethack-c/upstream/src/dothrow.c:240-247` sets `gm.m_shot.s` for ammo fired from the wielded launcher and only prints the shoot/throw volley message for multishot or explicit shot limits.
- `nethack-c/upstream/src/dothrow.c:1613-1648` uses matching-launcher range for direct throws: crossbows use `BOLT_LIM`, bow ammo gets one extra range, and the by-hand warning is only for unmatched non-gem ammo.
- `nethack-c/upstream/src/dothrow.c:2011-2228` routes thrown ammo hits through `thitmonst()`, adds launcher enchantment/erosion and weapon-hit bonuses when `ammo_and_launcher(obj, uwep)` is true, and calls `hmon()` on hits or `tmiss()` on misses.
- `nethack-c/upstream/src/uhitm.c:1075-1088` treats thrown ammo with a matching launcher as normal weapon damage rather than the `rnd(2)` by-hand ranged impact path.
- `nethack-c/upstream/src/weapon.c:216-263` supplies the ammo damage dice, including the crossbow-bolt `+1` row damage.
- `nethack-c/upstream/src/uhitm.c:1436-1507` suppresses strength damage for thrown ammo with a matching launcher, but still applies increase-damage and launcher weapon-skill damage.

## Port Notes

- Direct horizontal `t` throws now cache the wielded launcher used for range and air recoil.
- When thrown arrows or crossbow bolts hit a monster while the matching launcher is wielded, the direct throw path now reuses the launcher-ammo impact helper already used by `f`.
- Single direct shots still do not print `You shoot an arrow.`; the visible result is the hit or miss text.
- Unmatched arrows and bolts continue through the by-hand warning and `rnd(2)` impact path from audit 682.

## Tests

- `hero-thrown arrow with matching bow hits monster through C projectile path`
- `hero-thrown arrow with matching bow miss wakes monster without by-hand warning`
- `hero-thrown crossbow bolt with matching crossbow adds object-row damage`

## Remaining Follow-Ups

- Direct-throw matching launcher multishot is covered by audit 689, top-level shot limits by audit 694, prompt-selected count-one stack splitting by audit 737, and object/furniture mimic reveal by audit 738.
- By-hand/slung rocks and gems and lethal special cleanup remain separate projectile slices. Poisoned arrow/bolt side effects are covered by audits 687 and 739.
