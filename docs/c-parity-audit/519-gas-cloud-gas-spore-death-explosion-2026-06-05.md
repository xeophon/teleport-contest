# C Parity Audit 519: Gas Cloud Gas Spore Death Explosion

Environmental gas-cloud deaths now share the gas spore `AT_BOOM`/`AD_PHYS` death explosion queue. When a poison gas cloud kills a gas spore, JS records the death, drops inventory, emits `Boom!`, queues adjacent monster and hero blast effects from the shared two-roll helper, and removes the dead gas spore without creating a corpse.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. Canary seeds only set deterministic fixture RNG.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:327`: gas spore uses `ATTK(AT_BOOM, AD_PHYS, 4, 6)`.
- `nethack-c/upstream/src/mon.c:3199`: gas spores always explode instead of leaving corpses.
- `nethack-c/upstream/src/mon.c:3202`: `corpse_chance()` consumes the first `d(4,6)` death roll.
- `nethack-c/upstream/src/mon.c:3233`: non-swallowed gas spore death calls `mon_explodes()`.
- `nethack-c/upstream/src/explode.c:1026`: `mon_explodes()` consumes the actual blast damage roll.
- `nethack-c/upstream/src/region.c`: gas clouds apply region damage independently of melee/projectile death sources.

## JS Changes

- `js/allmain.js`
  - Imports the shared gas spore death explosion helper.
  - In `applyMonsterGasCloud()`, calls the helper after death recording and inventory drop.
  - Emits the helper's `Boom!` message and leaves queued adjacent blast handling to the shared queue.
- `test/shop-billing-helpers.test.mjs`
  - Adds direct region advancement coverage for a gas cloud killing a gas spore.
  - Asserts the two `d(4,6)` death/explosion rolls, no corpse, removed gas spore, adjacent monster damage, and adjacent hero damage.

## Follow-Ups

- Pet kills, conflict kills, trap kills, projectile/potion intervening kills, and queued command-mode pony deaths still need to route through shared gas spore death cleanup.
- Recursive gas spore explosion handling remains open when one gas spore's blast kills another gas spore.
- A broader shared monster death finalizer should eventually replace duplicated corpse/drop/remove logic across `allmain.js` and `cmd.js`.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "gas cloud killed gas spore" test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "gas spore" test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "fire breath" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
