# 745 - Hero projectile random treasure

## Implemented Slice

Hero projectile kills now run the C `xkilled()` random treasure gate before corpse/explosion handling:

- accessible or pool-square final projectile kills consume the `rn2(6)` treasure gate before corpse chance;
- non-`noCorpse`, non-Kop, non-cloned kills away from the hero square can place a random object on the killed monster square;
- generated food and oversized drops are filtered with the same local approximation already used by direct melee kills;
- gas spores still consume the treasure gate but skip the object/corpse drop and proceed to the death explosion before projectile landing.

C anchors:

- Hero thrown projectiles reach `hmon()` and lethal hits route through `killed()`/`xkilled()` before landing continues: `nethack-c/upstream/src/dothrow.c:1492`, `nethack-c/upstream/src/uhitm.c:1908`, `nethack-c/upstream/src/mon.c:3470`.
- `xkilled()` runs the random treasure block under the accessible/pool square gate and before corpse chance: `nethack-c/upstream/src/mon.c:3586`, `nethack-c/upstream/src/mon.c:3618`.
- The C predicate consumes `rn2(6)` before later `G_NOCORPSE`, hero-square, Kop, or cloned-monster gates reject the actual drop: `nethack-c/upstream/src/mon.c:3587`.
- Gas spore `corpse_chance()` explosion remains in the corpse path after the treasure gate: `nethack-c/upstream/src/mon.c:3199`.

JS changes:

- Added `maybeDropHeroProjectileKillRandomTreasure()` beside the projectile kill helper to place and filter random treasure drops: `js/cmd.js`.
- `killMonsterFromHeroProjectileHit()` now computes the shared `rn2(6)` treasure gate for every accessible/pool final projectile kill instead of only consuming it in the gas-spore branch: `js/cmd.js`.

## Tests Added

Added focused regression coverage in `test/shop-billing-helpers.test.mjs`:

- existing lethal dagger projectile canaries now assert the `rn2(6)` treasure gate appears after hit/damage and before corpse/landing-side-effect rolls;
- a forced-RNG command-level thrown dagger kill now drives the treasure gate open, creates a scroll-class random object at the killed goblin square, and verifies the thrown dagger still lands there afterward;
- existing gas spore, remembered invisible cleanup, rust passive, pet wording/luck, same-aligned unicorn guilt, and shifted vampire revival projectile canaries remain in the same focused block.

## Deferred Gaps

- Hero projectile kills still only update score XP through `recordVanquished()`/`urexp`; live `uexp`, level-up, and level-up messages remain a separate C parity gap.
- Monster lifesaving for projectile deaths remains separate from the shifted-vampire revival branch.
- Broader `hmon()` object-hit side effects outside the current projectile helper families remain open.
- Direct melee already had the local random-treasure approximation; this slice does not refactor that duplicate code.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "hero-thrown dagger lethal target removes monster|hero-thrown dagger lethal target can drop random treasure|hero-thrown dagger lethal tame target|hero-thrown dagger lethal target still applies passive object erosion|hero-thrown dagger lethal same-aligned unicorn|hero-thrown dagger lethal gas spore|hero-thrown dagger lethal remembered invisible target clears marker|hero-thrown dagger revives shifted vampire lethal target" test/shop-billing-helpers.test.mjs` - 8 pass, 2677 skipped
- `node --test --test-reporter=spec --test-name-pattern "command kicked ruby lethal target removes monster|hero-thrown ruby lethal target removes monster|hero-thrown lawful poisoned crossbow bolt can wear off" test/shop-billing-helpers.test.mjs` - 3 pass, 2682 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - full file passed
- `npm run score` - 44/44
