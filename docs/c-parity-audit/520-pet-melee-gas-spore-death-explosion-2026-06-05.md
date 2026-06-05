# C Parity Audit 520: Pet Melee Gas Spore Death Explosion

Pet melee deaths now share the gas spore `AT_BOOM`/`AD_PHYS` death explosion queue. When a pet kills a gas spore through the normal visible melee branch, JS records the kill, drops inventory, emits `Boom!`, queues adjacent monster and hero blast effects from the shared two-roll helper, removes the gas spore, and does not create a corpse.

The same explosion hook is also applied when a visible pet kill is delayed behind `--More--` and later finalized through `game._queued_dead_monsters`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. Canary seeds only set deterministic fixture RNG.

## Source Anchors

- `nethack-c/upstream/src/mhitm.c:1073`: monster-vs-monster direct hit subtracts damage.
- `nethack-c/upstream/src/mhitm.c:1088`: lethal monster-vs-monster damage routes through `monkilled()`.
- `nethack-c/upstream/src/mon.c:3199`: gas spores always explode on death.
- `nethack-c/upstream/src/mon.c:3202`: the first `d(4,6)` gas spore death roll is consumed before `mon_explodes()`.
- `nethack-c/upstream/src/mon.c:3233`: non-swallowed gas spore death calls `mon_explodes()` instead of corpse creation.
- `nethack-c/upstream/src/explode.c:1049`: `mon_explodes()` kills/removes the exploding monster before applying the explosion.

## JS Changes

- `js/allmain.js`
  - Adds `finishPetKilledMonster()` for normal pet-kill cleanup.
  - Routes the normal immediate pet melee kill branch through shared gas spore death explosion cleanup.
  - Routes the resumed pet-hit kill branch through the same cleanup.
  - Preserves ordinary non-gas-spore corpse/drop/grow-up/vanquish/remove behavior.
- `js/cmd.js`
  - Routes queued visible pet kills through `queueGasSporeDeathExplosion()` before corpse creation.
  - Inserts `Boom!` immediately before the blast entries added for that queued gas spore.
- `test/shop-billing-helpers.test.mjs`
  - Adds pet melee coverage for an immediate visible gas spore kill.
  - Adds queued-dead finalizer coverage by forcing the visible kill message behind `--More--`.
  - Asserts two `d(4,6)` rolls, no corpse, removed gas spore, adjacent monster damage, adjacent pet blast messaging, and adjacent hero damage.

## Follow-Ups

- Pony second-hit pet branches remain separate and still need gas spore death explosion routing.
- Pet trap kills and generic monster-vs-monster simplified attacks remain separate slices.
- Recursive gas spore explosion handling remains open when one gas spore's blast kills another gas spore.
- A broader shared monster death finalizer should eventually replace duplicated corpse/drop/remove logic across `allmain.js` and `cmd.js`.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "gas spore death explosion|fire breath killed gas spore|gas cloud killed gas spore|pet melee killed gas spore|queued pet melee killed gas spore" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
