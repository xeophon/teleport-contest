# 891 - Chest fire trap burns away slime

## C source

- `nethack-c/upstream/src/trap.c:6434` through `:6439` routes chest-trap fire payloads to `dofiretrap(obj)`.
- `nethack-c/upstream/src/trap.c:4237` through `:4254` rolls original fire damage and prints the object-centered fire or steam message.
- `nethack-c/upstream/src/trap.c:4300` through `:4304` applies nonzero tower-of-flame HP damage and then calls `burn_away_slime()`.
- `nethack-c/upstream/src/trap.c:4306` through `:4309` performs armor and inventory fire destruction after slime has been burned away.
- The pool/underwater branch returns at `nethack-c/upstream/src/trap.c:4251`, before `burn_away_slime()`, so this cleanup belongs only to the non-pool tower-of-flame path.

## Port

- `js/cmd.js` now calls the existing `burnAwayHeroSlime(messages)` helper in `applyChestTrapFirePayload()` after direct tower-of-flame HP damage survives and before `fireDamageInventory()`.
- The change reuses the same state cleanup and message already used by burning-oil explosions: `The slime that covers you is burned away!`.
- Fatal direct fire damage still returns before slime or inventory fire cleanup, matching C's immediate `losehp()` death behavior.

## Tests

- `#untrap known-box fire payload can burn carried scrolls` now starts the hero slimed and asserts message order:
  `A tower of flame...`, slime burned away, then the carried scroll burns.
- The same test verifies `game.u.slimed` and the visible `Slimed` status suffix are cleared without changing the C-shaped RNG log.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "#untrap known-box fire payload can burn carried scrolls|#untrap known-box fire payload on pool releases steam|#untrap known-box fatal fire payload enters death more" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`

## Remaining nearby gaps

- If direct tower-of-flame HP damage consumes an amulet of life saving, C `losehp()` can return to `dofiretrap()` and continue into `burn_away_slime()` and inventory fire. JS currently returns a life-saving More result from `applyChestTrapFireDamage()` before those follow-up effects, which should be handled as a separate continuation slice.
- Polymorphed golem-specific max-HP fire damage in C `dofiretrap()` is not modeled by this slice.
- C's `burnarmor()` gate before inventory destruction is represented by the existing JS inventory-fire approximation and was not changed here.
