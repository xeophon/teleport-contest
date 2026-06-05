# C Parity Audit 504: Stoning Lifesaving Self-Touch Unwield

When a hero loses form-derived petrification resistance and self-touches a wielded cockatrice corpse, life saving returns from `done(STONING)` back into `selftouch()`. C then forcibly clears the wield slot if the hero still has no gloves and no stone resistance. JS now mirrors that cleanup after the split `lifeSavingMore` continuation: the amulet is consumed, stoning state is cleared, HP is restored, and the unsafe corpse remains in inventory but is no longer wielded.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary uses the existing royal-jelly self-touch command path plus a normal worn amulet of life saving.

## Source Anchors

- `nethack-c/upstream/src/trap.c:3888` through `:3896`: `selftouch()` detects a wielded petrifying corpse, calls `instapetrify()`, then after life saving returns calls `uwepgone()` if the hero still lacks gloves and stone resistance.
- `nethack-c/upstream/src/trap.c:3844`: `instapetrify()` prints `You turn to stone...`, sets the killer to the corpse, and calls `done(STONING)`.
- `nethack-c/upstream/src/end.c:1081` through `:1119`: `done()` prints the life-saving medallion messages, consumes the amulet, calls `savelife()`, and clears the killer when survival succeeds.
- `nethack-c/upstream/src/end.c:702`: `savelife()` restores HP to the C life-saving formula and clears grave-arise state.
- `nethack-c/upstream/src/wield.c:873`: `uwepgone()` clears the wield slot and updates inventory.
- `nethack-c/upstream/src/objnam.c:1561`: inventory wield suffixes depend on the wield slot state.

## JS Changes

- `js/cmd.js`
  - Adds `clearUnsafePetrifyingCorpseWieldAfterLifeSaving()`.
  - Runs that helper only in the stoning life-saving continuation after stoning/death fields are cleared.
  - Clears `wielded` and `alternate` state from still-unsafe petrifying corpses and rebuilds their inventory line without the weapon suffix.

## Tests

- `stoning lifesaving after royal jelly selftouch unwields cockatrice corpse`
  - Drives cursed royal jelly through the same rehumanize self-touch path as audit 502, with a worn amulet of life saving.
  - Asserts the pre-continuation message includes rotten food, strength loss, return to human form, self-touch, immediate stoning, and medallion glow.
  - After pressing space, asserts `You feel much better!  The medallion crumbles to dust!`, cleared command mode, restored HP, cleared stoning/death fields, consumed amulet, retained corpse, and corpse no longer wielded.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "stoning lifesaving after royal jelly selftouch" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "cursed royal jelly rehumanizes|rehumanize selftouches|stoning lifesaving after royal jelly selftouch" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
