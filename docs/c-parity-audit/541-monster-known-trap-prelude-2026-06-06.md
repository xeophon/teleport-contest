# Monster known-trap prelude parity

## Scope

Ordinary monster post-move trap handling now uses a shared C-shaped pre-effect known-trap gate for the remaining branches that previously triggered effects immediately.

## C reference

- `nethack-c/upstream/src/trap.c:3795` computes `already_seen` from `mon_knows_traps(mtmp, tt)` plus the non-mindless `HOLE` special case.
- `nethack-c/upstream/src/trap.c:3803` skips the escape gate for `u.usteed`.
- `nethack-c/upstream/src/trap.c:3805` bypasses the prelude only for non-user Sokoban pits and holes.
- `nethack-c/upstream/src/trap.c:3809` returns before known-trap RNG when an in-air monster avoids a floor-trigger trap.
- `nethack-c/upstream/src/trap.c:3812` returns before learning/revealing/effects when `already_seen && rn2(4) && !forcebungle`.
- `nethack-c/upstream/src/trap.c:3816` learns/reveals the trap only after those skips fail.

## JS parity change

- Added `monsterAvoidsKnownTrapBeforeEffect(mon, trap)` around the existing known-trap bitset helper.
- Reused one floor-trigger classifier for path harmlessness and the pre-effect gate.
- Preserved C ordering for in-air floor-trigger skips, including the Sokoban pit/hole exception.
- Wired the pre-effect gate before side effects for:
  - `DART_TRAP`
  - `ROCKTRAP`
  - `LANDMINE`
  - `ROLLING_BOULDER_TRAP`
  - `WEB`
  - `MAGIC_PORTAL`
  - `SQKY_BOARD`
  - `ANTI_MAGIC`
- Moved `SLP_GAS_TRAP` onto the same in-air-before-known ordering.
- Replaced local known-trap checks for fire, pit, hole, and trapdoor branches with the shared helper.

## Tests

- `unknown ordinary monster trap pathing candidates stay hazardous`
- `known ordinary monster trap pathing candidates are skipped`
- `known ordinary monster trap prelude can skip effects before learning`
- `known ordinary monster trap prelude falls through on failed avoidance`
- `in-air monster sleep gas trap handling skips known-trap roll before effects`

The tests use deterministic fixtures and explicit RNG stubs. They do not depend on replay maps, hidden seeds, or runtime-specific behavior.

## Remaining nearby gaps

`ANTI_MAGIC` now has the C known-trap prelude, but the actual monster anti-magic effect remains under-modeled in JS; current ordinary monster handling only teaches/reveals through `monsterTriggerTrap()`.
