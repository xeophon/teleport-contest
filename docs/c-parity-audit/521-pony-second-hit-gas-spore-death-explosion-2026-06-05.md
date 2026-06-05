# C Parity Audit 521: Pony Second-Hit Gas Spore Death Explosion

Saddled pony second-hit deaths now route gas spores through the shared `AT_BOOM`/`AD_PHYS` death explosion queue. This covers both the hidden/noise inline second-hit branch and the visible `ponySecondAttackMore`/`ponyDamageMore` continuation path.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The hidden/noise canary controls the public core RNG sequence directly to exercise miss-then-hit; production code remains data-driven.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:327`: gas spores use `ATTK(AT_BOOM, AD_PHYS, 4, 6)`.
- `nethack-c/upstream/include/monsters.h:1004`: ponies have a kick attack followed by a bite attack.
- `nethack-c/upstream/src/mhitm.c:1073`: monster-vs-monster hit damage subtracts from defender HP.
- `nethack-c/upstream/src/mhitm.c:1088`: lethal monster-vs-monster damage calls `monkilled()`.
- `nethack-c/upstream/src/mhitm.c:1115`: monster grow-up handling follows death handling.
- `nethack-c/upstream/src/mon.c:3199`: gas spores always explode on death.
- `nethack-c/upstream/src/mon.c:3202`: the first `d(4,6)` gas spore death roll is consumed before `mon_explodes()`.
- `nethack-c/upstream/src/mon.c:3233`: non-swallowed gas spore death calls `mon_explodes()` instead of corpse creation.
- `nethack-c/upstream/src/explode.c:1025`: `mon_explodes()` consumes the blast damage roll.
- `nethack-c/upstream/src/explode.c:1049`: `mon_explodes()` kills/removes the source before applying the blast.

## JS Changes

- `js/allmain.js`
  - Extends `finishPetKilledMonster()` with an explicit force-no-repeat option for the pony second-hit branch.
  - Routes the hidden/noise inline saddled pony second-hit death through `finishPetKilledMonster()`.
  - Stores the pony on `_pony_second_attack` so command-mode death cleanup can run grow-up logic against the killer.
- `js/cmd.js`
  - Routes gas spores killed in `ponyDamageMore` through `queueGasSporeDeathExplosion()`.
  - Preserves the existing visible `destroyed!` command-mode message while appending `Boom!` and queued adjacent blast effects.
- `test/shop-billing-helpers.test.mjs`
  - Adds a saddled pony fixture.
  - Adds hidden/noise inline second-hit gas-spore coverage with explicit core RNG values for miss-then-hit.
  - Adds direct command-mode `ponySecondAttackMore`/`ponyDamageMore` coverage with a guaranteed second hit.
  - Asserts two `d(4,6)` rolls, no corpse, removed gas spore, adjacent monster damage, adjacent pony blast messaging, and adjacent hero damage.

## Follow-Ups

- Pet trap kills and generic simplified monster-vs-monster/conflict kills remain separate slices.
- Projectile/potion intervening kills and recursive gas-spore-chain explosions remain open.
- The broader `ponyDamageMore` combat model still has simplified non-gas-spore death handling; this slice only adds the gas-spore death explosion path.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "pony second-hit killed gas spore|pet melee killed gas spore|queued pet melee killed gas spore" test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "gas spore" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
