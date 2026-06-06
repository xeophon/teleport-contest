# Monster First-Entry Hole And Trapdoor

## Scope

Port the first-entry `HOLE` and `TRAPDOOR` effect for ordinary monsters and pets after movement. This covers visible C wording, trap learning, pet post-move handling, migration-shaped removal from the current level, bottom/no-target nonfall, and huge/non-grounded nonfall gates.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/monmove.c:1455` through `:1516` calls `mintrap()` from `postmov()` after a successful monster move and treats `Trap_Moved_Mon` as off-level for turn processing.
- `nethack-c/upstream/src/monmove.c:1771` through `:1774` sends tame monsters through `dog_move()` and then the same `postmov()` first-entry trap path.
- `nethack-c/upstream/src/trap.c:3790` through `:3821` implements first-entry avoidance and learning: known traps, plus non-mindless monsters seeing `HOLE`, skip 3/4 of the time; non-skipped traps call `mon_learns_traps()` before the trap effect.
- `nethack-c/upstream/src/trap.c:2013` through `:2068` handles `trapeffect_hole()`, including no-fall levels, non-grounded/long-worm/huge gates, and Sokoban inescapable fall-through.
- `nethack-c/upstream/src/teleport.c:2006` through `:2095` handles monster level teleport from holes/trapdoors, prints "falls into a hole" or "falls through a trap door" when visible, calls `seetrap()`, and migrates the monster with `MIGR_RANDOM`.
- `nethack-c/upstream/src/dog.c:887` through `:927` shows the migration metadata shape: target level in `mux/muy`, source level and square in `mtrack`, migration mode in `mtrack[0]`, and `mx=my=0`.

## JS Change

- `js/allmain.js` adds `monsterHoleTrapEffect()` and calls it from both the ordinary monster movement trap path and the pet post-move trap path.
- Successful visible falls now use C-facing wording for both `HOLE` and `TRAPDOOR`.
- Monsters and pets that fall are removed from `game.level.monsters`, queued in `game.migrating_mons`, marked `MON_MIGRATING`, set to `mx=my=0`, and carry `MIGR_RANDOM`/source/target migration metadata.
- First-entry skipped by known-trap avoidance still happens before learning. Bottom/no-target and huge nonfall cases now learn the trap without migrating, matching the C ordering after `mon_learns_traps()`.
- Non-Sokoban in-air floor-trigger prelude remains a harmless skip before learning; Sokoban inescapable holes/trapdoors keep the fall-through route.

## Tests

- `monster first-entry hole and trapdoor migrate off level visibly`
- `pet first-entry hole and trapdoor migrate off level visibly`
- `monster first-entry hole on bottom level learns trap without migrating`
- `huge monster first-entry hole learns trap without falling through`
- Existing already-trapped `HOLE` tests continue to cover the separate caught-monster branch.

The tests use local monster, pet, trap, visibility, dungeon, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Leashed pet veto/slack behavior for off-level monster teleport remains broader monster migration parity.
- Stronghold-to-Valley and full arrival processing for `game.migrating_mons` remain broader level migration parity.
