# Kicked Spear And War Hammer Hits

## C anchors

- `nethack-c/upstream/src/dokick.c:733` through `:741`: kicking a floor object extracts it, sends it through `bhit(..., KICKED_WEAPON, ...)`, and then calls `thitmonst()` when a monster is hit.
- `nethack-c/upstream/src/dothrow.c:2010` through `:2028`: `thitmonst()` classifies `obj == gk.kickedobj` as `HMON_KICKED`.
- `nethack-c/upstream/src/dothrow.c:2152` through `:2162`: kicked weapons still roll `rnd(20)`, but kicked non-ammo objects apply the kicked `-3` hit adjustment instead of thrown weapon adjustments or throwing skill to-hit bonuses.
- `nethack-c/upstream/include/objects.h:174` through `:176`: ordinary spear uses `d6` small-target and `d8` large-target damage with `P_SPEAR`.
- `nethack-c/upstream/include/objects.h:367` through `:370`: war hammer uses `d4` small-target and large-target damage with `P_HAMMER`; the C object table's small-target `+1` is applied by `dmgval()`.
- `nethack-c/upstream/src/weapon.c:216` through `:285`: `dmgval()` rolls ordinary weapon damage and adds the war hammer small-target `+1`.
- `nethack-c/upstream/src/uhitm.c:1436` through `:1505`: surviving weapon hits add damage increase, strength damage, and weapon-skill damage.
- `nethack-c/upstream/src/dothrow.c:2193` through `:2228` and `nethack-c/upstream/src/dokick.c:771` onward: a successful kicked hit runs `hmon()`, exercises Dexterity, skips missile mulch for spear/war hammer, runs `passive_obj()`, then returns to the kicked-object landing tail.

## JS parity

- Existing kicked weapon routing already uses `heroKickedWeaponHitValue()` and `heroKickedWeaponImpact()` for supported weapon rows.
- New command-path canaries pin ordinary floor-kicked spear and war hammer hits against adjacent ordinary monsters.
- The tests assert the kicked object remains a floor object and lands on the monster square rather than being removed from inventory, which distinguishes kicked floor-object flow from direct hero-thrown inventory flow.
- The tests also assert there is no missile-mulch RNG for spear or war hammer.

## Replay-free coverage

- `command kicked spear harms ordinary monster and survives landing`
- `command kicked war hammer harms ordinary monster and survives landing`

The tests drive the real kick command with deterministic unit RNG only. They assert kick wording, hit wording, HP loss derived from the logged weapon damage roll plus strength and skill damage, wake/anger cleanup, landing coordinates, and RNG label order.

## Remaining candidates

- Direct hero-thrown silver spear against silver-hating monsters needs the C `special_dmgval()` silver bonus.
- Blessed spear/war hammer target-form bonus damage needs separate `mon_hates_blessings()` coverage.
- Non-wielded aklys can be covered later, but wielded aklys return behavior should stay separate.
