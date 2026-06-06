# Hero Projectile Aklys Hit

## C anchors

- `nethack-c/upstream/include/objects.h:381` through `:383`: aklys is a weapon-class `P_CLUB` object with small-target `d6`, large-target `d3`, and no object hit bonus.
- `nethack-c/upstream/src/dothrow.c:28` through `:34`: aklys auto-return only applies when the thrown object was worn as the primary weapon (`W_WEP`).
- `nethack-c/upstream/src/dothrow.c:1519` through `:1523` and `:1664` through `:1677`: tethered aklys range/beam display is likewise primary-wielded-only; ordinary non-wielded aklys uses the normal `THROWN_WEAPON` path.
- `nethack-c/upstream/src/dothrow.c:1911` through `:1947`: `omon_adj()` adds weapon `hitval()` for weapon-class thrown objects.
- `nethack-c/upstream/src/dothrow.c:2181` through `:2190`: thrown non-ammo weapons meant to be thrown get the C thrown-weapon `+2` hit adjustment plus weapon hit bonus.
- `nethack-c/upstream/src/weapon.c:216` through `:344`: `dmgval()` rolls object-table base damage before enchantment, target-form bonuses, and erosion.
- `nethack-c/upstream/src/uhitm.c:942` through `:944` and `:1473` through `:1506`: `hmon()` uses `dmgval()` for weapon hits, then applies strength/damage-increase and weapon-skill damage; aklys inherits the `P_CLUB` skill.

## JS parity

- `js/cmd.js` now includes aklys in `HERO_THROWN_WEAPON_MONSTER_DATA` with C's `d6` small-target damage, `d3` large-target damage, zero hit bonus, and `P_CLUB` skill mapping.
- The existing direct/kicked weapon hit path handles aklys as a normal non-artifact projectile weapon. No return-to-hand or tethered range behavior was added for this slice because C gates that behavior on the primary worn weapon mask.

## Replay-free coverage

- `hero-thrown non-wielded aklys harms ordinary monster with club skill damage`
- `hero-thrown non-wielded aklys uses large-target damage die`

The canaries drive the real throw command with deterministic unit RNG only. They assert the ordinary hit text, absence of returning-aklys text, HP loss derived from the logged `rnd(6)` or `rnd(3)` plus expert club-skill bonus, monster wake/flee-state cleanup, inventory removal, landing coordinates, retained stack count, and hit/damage/landing RNG order.

## Remaining candidates

- Kicked aklys canaries can pin the same object row through the floor-kick command path.
- Kicked weapon special-damage canaries should also pin the separate C landing tail, where surviving kicked weapons do not take the direct-thrown hard-floor `rn2(100)` break probe.
- Wielded/returning aklys behavior remains intentionally separate because C routes it through `AutoReturn()` and tethered weapon range/display state.
- Blessed or silver aklys-like special cases are blocked on canonical material/object metadata beyond ordinary iron aklys.
