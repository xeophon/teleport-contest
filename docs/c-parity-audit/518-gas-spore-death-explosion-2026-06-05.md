# C Parity Audit 518: Gas Spore Death Explosion

Player-killed gas spores already used a narrow death explosion queue. This slice tightens the queued hero blast to match C's `AT_BOOM`/`AD_PHYS` effects for the covered hero-melee death path and starts moving the boom into shared monster death cleanup: gas spores now carry runtime `boom`/`phys` attack metadata, the two-roll death explosion queue lives in a leaf helper, and direct fire-breath/pit fire-ray monster deaths use that helper instead of creating a corpse.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. Canary seeds only set deterministic fixture RNG.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:325`: gas spore monster definition.
- `nethack-c/upstream/include/monsters.h:327`: gas spore uses `ATTK(AT_BOOM, AD_PHYS, 4, 6)`.
- `nethack-c/upstream/src/mon.c:3199`: gas spores always explode on death.
- `nethack-c/upstream/src/mon.c:3202`: death cleanup consumes the first `d(4,6)` roll.
- `nethack-c/upstream/src/mon.c:3233`: non-swallowed gas spore death calls `mon_explodes()`.
- `nethack-c/upstream/src/explode.c:1019`: `mon_explodes()` dispatches monster explosions.
- `nethack-c/upstream/src/explode.c:1026`: `mon_explodes()` consumes the actual blast damage roll.
- `nethack-c/upstream/src/explode.c:590`: hero injury is processed after nearby monster/floor effects.
- `nethack-c/upstream/src/explode.c:602`: hero caught wording uses the monster explosion name.
- `nethack-c/upstream/src/explode.c:608`: invulnerability zeroes explosion damage and reports the hero unharmed.
- `nethack-c/upstream/src/explode.c:611`: `AD_PHYS` hero explosion damage uses `Maybe_Half_Phys()`.
- `nethack-c/upstream/src/explode.c:641`: lethal monster explosions route through fatal `done()` handling.

## JS Changes

- `js/cmd.js`
  - Reuses the shared gas spore death explosion helper from the existing hero-melee kill path.
  - Applies `maybeHalfPhysicalDamage()` to queued hero blast HP loss.
  - Preserves the C `destroy_items(AD_PHYS)` `rn2(5)` shape already present in the queue.
  - Adds invulnerable hero handling with `You are unharmed!`.
  - Sets the gas spore explosion death cause and routes fatal/life-saving outcomes through `applyLifeSavingOrFatalCommandMode()`.
- `js/mklev.js`
  - Adds gas spore runtime attack metadata from the C monster row: 4d6 `boom`/`phys`.
- `js/monster_death.js`
  - Adds a leaf helper for gas spore `AT_BOOM` death explosions.
  - Preserves the non-swallowed C RNG shape: one unused `d(4,6)`, then the actual shared blast `d(4,6)`.
  - Queues visible adjacent monster blast messages before the adjacent hero blast message.
- `js/fire_breath.js`
  - Routes direct fire-breath and fire-ray pit monster deaths through the shared gas spore helper after inventory drop/removal.
  - Skips ordinary corpse/drop RNG and corpse creation when `AT_BOOM` fires.

## Tests

- `gas spore death explosion uses shared half-physical blast and leaves no corpse`
  - Asserts two `d(4,6)` gas spore rolls, the second roll as shared blast damage, half physical damage for the hero, adjacent monster damage, and no gas spore corpse/drop.
- `fatal gas spore death blast arms death more`
  - Asserts fatal caught-in-explosion wording, death command mode, HP zero, and the gas spore explosion death cause.
- `life saving rescues fatal gas spore death blast`
  - Asserts medallion consumption, life-saving command mode, and post-more HP restoration.
- `invulnerable hero is unharmed by gas spore death blast`
  - Asserts invulnerability prevents HP loss without suppressing the caught-in-explosion message.
- `fire breath killed gas spore explodes outside hero melee`
  - Asserts a direct fire-breath monster death queues the same gas spore blast, suppresses corpse creation, removes the gas spore, and damages adjacent monster/hero targets from the second `d(4,6)` roll.

## Follow-Ups

- Hook pet kills, conflict kills, trap kills, queued fire-breath monster hits, and other direct monster death paths without double-recording vanquishes or drops.
- Add recursive gas spore explosion handling when one gas spore kills another.
- Generalize the helper into a broader shared monster death cleanup path once more death sources are covered.
- Polyself/old-form death from gas spore physical explosions remains broader fatal-state work.

## Verification

- `node --check js/cmd.js`
- `node --check js/fire_breath.js`
- `node --check js/mklev.js`
- `node --check js/monster_death.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "gas spore" test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "fire breath" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
