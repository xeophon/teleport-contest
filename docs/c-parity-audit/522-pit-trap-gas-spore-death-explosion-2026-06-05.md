# C Parity Audit 522: Pit Trap Gas Spore Death Explosion

Pit and spiked-pit trap deaths now share a trap death finalizer that routes `AT_BOOM`/`AD_PHYS` monsters through the gas-spore death explosion queue before corpse creation. This covers the explicit normal-monster pit branch and the pet pit branch without replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks.

Gas spores are flying/in-air monsters, so ordinary pits do not catch them. The focused regression uses a Sokoban-rule pit, matching C's inescapable-pit exception for otherwise non-grounded monsters and reaching the normal monster pit branch with real gas-spore data.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:327`: gas spores use `ATTK(AT_BOOM, AD_PHYS, 4, 6)`.
- `nethack-c/upstream/src/trap.c:1935`: pit/spiked-pit trap messaging and damage are handled by `trapeffect_pit()`.
- `nethack-c/upstream/src/trap.c:1966`: the monster branch of `trapeffect_pit()` computes visibility and trap result state.
- `nethack-c/upstream/src/trap.c:1970`: non-user Sokoban pits are inescapable for monsters.
- `nethack-c/upstream/src/trap.c:1985`: ordinary non-grounded monsters avoid pits unless the pit is inescapable.
- `nethack-c/upstream/src/trap.c:2002`: monster pit damage calls `thitm(... rnd(10 or 6), FALSE)`.
- `nethack-c/upstream/src/trap.c:2942`: `trapeffect_selector()` dispatches `PIT` and `SPIKED_PIT` to `trapeffect_pit()`.
- `nethack-c/upstream/src/trap.c:3733`: `mintrap()` is the shared monster trap entry point.
- `nethack-c/upstream/src/trap.c:6752`: lethal `thitm()` damage subtracts HP and calls `monkilled(mon, "", AD_PHYS)`.
- `nethack-c/upstream/src/mon.c:3199`: gas spores always explode on death.
- `nethack-c/upstream/src/mon.c:3233`: non-swallowed gas spore death calls `mon_explodes()` and returns no corpse.
- `nethack-c/upstream/src/explode.c:1025`: `mon_explodes()` consumes the blast damage roll.
- `nethack-c/upstream/src/explode.c:1049`: `mon_explodes()` removes the source before applying the blast.

## JS Changes

- `js/allmain.js`
  - Adds `finishTrapKilledMonster()` for trap-driven monster death cleanup.
  - Routes normal monster `PIT`/`SPIKED_PIT` deaths through that helper.
  - Routes pet `PIT`/`SPIKED_PIT` deaths through that helper while preserving the pet post-move skip flag.
  - Suppresses corpse creation when `queueGasSporeDeathExplosion()` returns an explosion.
- `test/shop-billing-helpers.test.mjs`
  - Adds deterministic Sokoban pit gas-spore death coverage.
  - Asserts pit visibility, killed and `Boom!` messages, two `d(4,6)` gas-spore rolls, no corpse, removed source monster, adjacent monster blast damage, and adjacent hero blast damage.

## Follow-Ups

- `DART_TRAP` deaths remain separate; pet dart deaths currently can reach zero HP without full death finalization.
- Pet pit immunity for flying/in-air monsters remains a separate parity check; the current slice only shares death finalization if the pet pit branch kills a monster.
- Generic simplified monster-vs-monster/conflict kills, projectile/potion intervening kills, and recursive gas-spore-chain explosions remain open.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "sokoban pit trap killed gas spore" test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "sokoban pit trap killed gas spore|gas spore" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
