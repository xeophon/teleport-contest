# Hero Projectile Spear Variant Hits

## C anchors

- `nethack-c/upstream/src/dothrow.c:1477` through `:1495`: direct hero-thrown objects that reach a monster route into `thitmonst()`.
- `nethack-c/upstream/src/dothrow.c:1428` through `:1437`: `throwing_weapon()` includes `is_spear()`, so spear variants are meant to be thrown.
- `nethack-c/upstream/src/dothrow.c:2152` through `:2188`: weapon hits roll `rnd(20)`; thrown non-ammo weapons get the meant-to-be-thrown `+2` adjustment and weapon hit bonus.
- `nethack-c/upstream/include/objects.h:177` through `:188`: elven, orcish, dwarvish, and silver spears use `P_SPEAR`; their small-target dice are `d7`, `d5`, `d8`, and `d6`; all four use `d8` against large targets.
- `nethack-c/upstream/src/weapon.c:216` through `:285`: `dmgval()` rolls the object small/large damage die before enchantment and erosion handling.
- `nethack-c/upstream/src/weapon.c:326` through `:341`: blessed and silver target-form bonuses are separate `special_dmgval()` cases and are deliberately outside this ordinary-target slice.
- `nethack-c/upstream/src/uhitm.c:1075` and `:1436` through `:1505`: thrown spear variants use ordinary weapon damage, then strength, damage-increase, and `P_SPEAR` weapon-skill damage apply.
- `nethack-c/upstream/src/dothrow.c:1976` through `:1992` and `:2193` through `:2228`: spear variants are not missile ammo, so successful hits skip hit-only missile mulch, exercise Dexterity, run passive-object handling, and then return to the landing tail.

## JS parity

- Direct hero-thrown singleton plain non-artifact spear variants now use the shared hero projectile weapon path.
- The direct-hit weapon metadata includes actual-kind rows for `elven spear`, `orcish spear`, `dwarvish spear`, and `silver spear`.
- Small-target damage now follows the C object rows: elven `d7`, orcish `d5`, dwarvish `d8`, silver `d6`.
- Large-target direct hits use `d8` for the variant rows, matching the C object metadata.
- Silver-hater and blessed target-form bonus damage remains deferred to a later source-backed `special_dmgval()` slice.

## Replay-free coverage

- `hero-thrown spear variants use C small-target dice with spear skill damage`
- `hero-thrown orcish spear uses large-target damage die`

The tests drive the real `throw` command path with deterministic unit RNG only. They assert hit wording, exact HP loss with expert `P_SPEAR` skill damage, wake/anger cleanup, inventory removal, landing coordinates, and RNG label order without missile-mulch rolls.

## Remaining candidates

- Direct hero-thrown silver spear against silver-hating monsters needs the C `special_dmgval()` silver bonus.
- Blessed spear variant target-form bonus damage needs separate `mon_hates_blessings()` coverage.
- Kicked ordinary spear and war hammer canaries are good next candidates because they exercise the C kicked `-3` non-ammo hit adjustment without aklys return behavior.
