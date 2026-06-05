# Dart trap lethal monster cleanup

## C anchors

- `trap.c:1061` `floor_trigger()` includes `ARROW_TRAP`, `DART_TRAP`, and `ROCKTRAP`.
- `trap.c:1086` `check_in_air()` treats flying/floating monsters as up in the air.
- `trap.c:3808` `mintrap()` returns `Trap_Effect_Finished` for non-forced floor-trigger traps when `check_in_air()` is true.
- `trap.c:1299` `trapeffect_dart_trap()` handles the spent known trap case, then creates a dart and calls `thitm(7, mtmp, otmp, 0, FALSE)`.
- `trap.c:6751` `thitm()` subtracts projectile damage and calls `monkilled(mon, "", AD_PHYS)` on lethal hits.
- `mon.c:3199` gas spores explode from `mondied()` and do not leave a corpse.

## JS gap

- `moveMonsterTowardHero()` already skipped in-air monsters through `monsterTrapHarmless()`, matching `mintrap()`'s early floor-trigger return.
- Lethal normal-monster dart hits only called `recordVanquished()` and removed the monster. That skipped the shared death cleanup used by C-like trap deaths, including carried inventory drops and gas-spore/death side effects when reachable through forced trap paths.
- Lethal pet dart hits only clamped HP to zero and left same-turn removal/finalization to unrelated cleanup.

## Change

- Route lethal normal-monster dart hits through `finishTrapKilledMonster(mon)`.
- Route lethal pet dart hits through `finishTrapKilledMonster(mon, { skipPetPostMoveRoll: true })`.
- Keep projectile traps in the in-air floor-trigger list, preserving the earlier `mintrap()` skip for ordinary flying/floating monsters.

## Coverage

- `dart trap does not hit in-air gas spore` verifies the `floor_trigger()`/`check_in_air()` skip remains intact.
- `dart trap killed grounded monster drops inventory before removal` verifies the normal-monster lethal dart path now runs full trap death cleanup.
- `pet dart trap killed grounded monster is removed immediately` verifies pet dart lethals finalize immediately instead of leaving a zero-HP pet for later filtering.
