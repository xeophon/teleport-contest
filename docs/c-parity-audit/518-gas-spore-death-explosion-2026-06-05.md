# C Parity Audit 518: Gas Spore Death Explosion

Player-killed gas spores already used a narrow death explosion queue. This slice tightens the queued hero blast to match C's `AT_BOOM`/`AD_PHYS` effects for the covered hero-melee death path: the second 4d6 roll remains the shared blast damage, physical damage is halved by half physical damage, invulnerability prints the unharmed follow-up, and lethal blasts now route through death/life-saving command modes.

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
  - Keeps the existing hero-melee gas spore death queue and two-roll `d(4,6)` RNG shape.
  - Applies `maybeHalfPhysicalDamage()` to queued hero blast HP loss.
  - Preserves the C `destroy_items(AD_PHYS)` `rn2(5)` shape already present in the queue.
  - Adds invulnerable hero handling with `You are unharmed!`.
  - Sets the gas spore explosion death cause and routes fatal/life-saving outcomes through `applyLifeSavingOrFatalCommandMode()`.

## Tests

- `gas spore death explosion uses shared half-physical blast and leaves no corpse`
  - Asserts two `d(4,6)` gas spore rolls, the second roll as shared blast damage, half physical damage for the hero, adjacent monster damage, and no gas spore corpse/drop.
- `fatal gas spore death blast arms death more`
  - Asserts fatal caught-in-explosion wording, death command mode, HP zero, and the gas spore explosion death cause.
- `life saving rescues fatal gas spore death blast`
  - Asserts medallion consumption, life-saving command mode, and post-more HP restoration.
- `invulnerable hero is unharmed by gas spore death blast`
  - Asserts invulnerability prevents HP loss without suppressing the caught-in-explosion message.

## Follow-Ups

- Generalize gas spore `AT_BOOM` into shared monster death cleanup instead of the current hero-melee-only hook.
- Add runtime gas spore attack metadata (`boom`/`phys`/4d6) so future death sources do not key only on monster name.
- Hook pet kills, conflict kills, fire breath kills, and other direct monster death paths without double-recording vanquishes or drops.
- Add recursive gas spore explosion handling when one gas spore kills another.
- Polyself/old-form death from gas spore physical explosions remains broader fatal-state work.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "gas spore" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
