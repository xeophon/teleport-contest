# Monster anti-magic artifact damage parity

## Scope

Magic-resistant monsters that trigger `ANTI_MAGIC` traps now include the C artifact damage adders for wielded Magicbane and carried anti-magic defending artifacts.

## C reference

- `nethack-c/upstream/src/trap.c:2418` starts resistant monster damage with base `rnd(4)`.
- `nethack-c/upstream/src/trap.c:2420` adds `rnd(4)` when `MON_WEP(mtmp)` is Magicbane.
- `nethack-c/upstream/src/trap.c:2423` scans `mtmp->minvent` for the first artifact where `defends_when_carried(AD_MAGM, otmp)`.
- `nethack-c/upstream/src/trap.c:2428` adds one carried-artifact `rnd(4)` when that scan succeeds.
- `nethack-c/upstream/src/trap.c:2429` quarters the already-added damage for pass-wall monsters.
- `nethack-c/upstream/src/mondata.c:227` treats wielded `DFNS(AD_MAGM)` artifacts as magic resistance.
- `nethack-c/upstream/src/mondata.c:241` treats carried `CARY(AD_MAGM)` artifacts as magic resistance.
- `nethack-c/upstream/include/artilist.h:145` defines Magicbane as `DFNS(AD_MAGM)` with `NO_CARY`.
- `nethack-c/upstream/include/artilist.h:219`, `:255`, and `:291` define the carried `CARY(AD_MAGM)` artifacts: The Orb of Detection, The Magic Mirror of Merlin, and The Platinum Yendorian Express Card.

## JS parity change

- Added C-derived artifact-name helpers in `js/allmain.js` that read explicit `artifact`/`oartifact` fields.
- Added wielded `DFNS(AD_MAGM)` artifact resistance to `monsterResistsAntiMagicTrap()`.
- Added carried `CARY(AD_MAGM)` artifact resistance to `monsterResistsAntiMagicTrap()` and anti-magic pathing.
- Added the resistant-damage RNG order: base `rnd(4)`, Magicbane `rnd(4)`, carried artifact `rnd(4)`, then pass-wall quartering.
- Kept carried artifact damage to one extra roll even when multiple qualifying artifacts are present.

## Tests

- `carried magic-defending artifact anti-magic pathing candidate is harmless like C`
- `monster wielding Magicbane takes extra anti-magic implosion damage`
- `monster carrying magic-defending artifact takes extra anti-magic implosion damage`
- `multiple carried magic-defending artifacts add only one anti-magic damage roll`
- `Magicbane and carried magic-defending artifact stack before pass-wall quartering`
- `unwielded Magicbane does not confer monster anti-magic resistance`
- `carried DFNS magic artifact does not confer monster anti-magic resistance`

The tests use direct helper fixtures and explicit RNG queues. They do not depend on replay maps, hidden seeds, player names, or runtime-specific behavior.
