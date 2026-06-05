# Monster sleep gas known-trap avoidance parity

## Scope

Ordinary monster `SLP_GAS_TRAP` handling now mirrors the C `mintrap()` known-trap escape check before applying the gas effect.

## C reference

- `nethack-c/upstream/src/trap.c:3795` computes `already_seen` from `mon_knows_traps(mtmp, tt)` plus the special non-mindless `HOLE` case.
- `nethack-c/upstream/src/trap.c:3812` returns `Trap_Effect_Finished` for non-forced traps when `already_seen && rn2(4) && !forcebungle`.
- `nethack-c/upstream/src/trap.c:3816` learns and reveals the trap only after the known-trap escape fails.
- `nethack-c/upstream/src/trap.c:1563` applies sleep gas to monsters; non-resistant, breathing, non-helpless monsters call `sleep_monst(mtmp, rnd(25), -1)` and reveal the trap only when the sleep message is visible.

## JS parity change

- Added `monsterAvoidsKnownTrapEffect(mon, trap)` for the shared C `already_seen && rn2(4)` gate.
- Extracted `monsterSleepGasTrapEffect(mon, trap)` so ordinary monsters roll the known-trap escape before `monsterTriggerTrap()` and before `rnd(25)`.
- Kept the existing handled-return shape for `SLP_GAS_TRAP` in ordinary monster movement.
- Exposed the sleep gas helper through `__allmainTestHooks` for focused RNG-order tests.

## Tests

- `known sleep gas trap can be avoided by monster before gas effects`
- `known sleep gas trap failed monster avoidance still applies gas`

The tests prove that a known sleep gas trap with a nonzero `rn2(4)` result consumes only that roll and leaves the monster awake, the trap unseen, and no sleep message queued. A failed avoidance roll proceeds to `rnd(25)`, freezes the monster, reveals the trap when visible, and emits the sleep message.

## Remaining nearby gaps

The same broad C `mintrap()` known-trap gate is still not uniformly wired into every ordinary monster trap branch. Remaining candidates from the read-only audit include `DART_TRAP`, `ROCKTRAP`, `LANDMINE`, `ROLLING_BOULDER_TRAP`, `WEB`, `MAGIC_PORTAL`, `SQKY_BOARD`, and `ANTI_MAGIC`.
