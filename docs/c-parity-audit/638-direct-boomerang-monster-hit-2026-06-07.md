# Direct Boomerang Monster Hits

## C anchors

- `nethack-c/upstream/src/dothrow.c:30` through `:34`: `AutoReturn()` treats boomerangs as auto-returning regardless of wield state, unlike aklys/Mjollnir which require the saved `W_WEP` mask.
- `nethack-c/upstream/src/dothrow.c:1601` through `:1611`: non-underwater boomerang throws divert to `boomhit()` and only return directly to inventory when `boomhit()` reports the hero caught the returning missile.
- `nethack-c/upstream/src/zap.c:4148` through `:4232`: `boomhit()` walks a ten-step curved path, handles monster hits through `throwit_mon_hit()`, and performs the hero catch/fumble branch only when the path reaches the hero square.
- `nethack-c/upstream/include/objects.h:166` through `:168`: boomerang object data is 9 small damage, 9 large damage, hit bonus 0, skill `P_BOOMERANG`, material `WOOD`.
- `nethack-c/upstream/src/dothrow.c:2181` through `:2190`: thrown non-ammo boomerangs receive an arbitrary `+4` hit adjustment before `weapon_hit_bonus()`, instead of the generic `+2` used by other intended throwing weapons.
- `nethack-c/upstream/src/dothrow.c:1981` through `:1985`: boomerangs are excluded from missile mulching after monster hits.

## JS parity

- `HERO_THROWN_WEAPON_MONSTER_DATA` now includes boomerang 9/9 damage, `P_BOOMERANG`, and skill name `boomerang`.
- Direct thrown weapon hit value now applies the C `+4` boomerang adjustment while leaving other modeled thrown weapons on their existing `+2` path.
- Test fixtures now provide a wood `monsterBoomerang()` object and map `P_BOOMERANG` to the explicit boomerang skill helper.

## Replay-free coverage

- `hero-thrown boomerang harms ordinary monster with boomerang skill damage`
- `hero-thrown boomerang uses C plus-four thrown hit bonus`
- `hero-thrown boomerang uses C 9-sided die against large targets`

The ordinary-monster canary drives the real `t` command, asserts the first C-order calls `rnd(20)`, `rnd(9)`, `rn2(19)`, and `rn2(100)`, and verifies expert boomerang damage, wake/anger side effects, inventory removal, and floor landing.

The hit-bonus canary sets the target AC so the seeded `rnd(20)=14` only hits with the C boomerang `+4` adjustment; the generic `+2` thrown-weapon adjustment would miss and skip the `rnd(9)` damage roll.

The large-target canary asserts that a large monster still uses `rnd(9)`, matching the C 9/9 object row rather than an aklys-style reduced large-target die.

## Remaining candidates

- Full `boomhit()` curved path parity remains open: ten-step path traversal, left/right handedness, sink `Klonk!`, levitation/air-level recoil, failed self-catch damage, successful `You skillfully catch the boomerang.`, and final landing at `gb.bhitpos`.
- Underwater boomerang throws should continue through the ordinary forced-range-1 path and are separate from this non-underwater direct-hit slice.
