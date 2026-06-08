# C Parity Audit 785: Monster-Thrown Cockatrice Egg Munstone and Tiny Remains

Implemented the next production monster-thrown petrifying egg intervening-monster fallout slice. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:340` through `:350`: intervening-monster projectile hit value uses `5 + find_mac() + omon_adj()` and `rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:385` through `:399`: visible petrifying egg hits use `Splat!  <Mon> is hit with <an egg/a cockatrice egg>!`.
- `nethack-c/upstream/src/mthrowu.c:444` through `:447`: petrifying egg hits call `munstone(mtmp, FALSE)` before `minstapetrify(mtmp, FALSE)`.
- `nethack-c/upstream/src/muse.c:2884` through `:2897`: `munstone()` rejects stone-resistant, eating, or helpless monsters, clears `STRAT_WAITFORU`, then scans monster inventory for curing items.
- `nethack-c/upstream/src/muse.c:2922` through `:2963`: successful monster self-cure applies the petrification speed adjustment, consumes the cure item, and prints the consume plus `seems limber!` message.
- `nethack-c/upstream/src/muse.c:2985` through `:2996`: valid cure items are potion of acid, slimeproof glob of green slime, lizard corpse/tin, or acidic corpse/tin.
- `nethack-c/upstream/src/trap.c:3858` through `:3879`: uncured monsters that do not polyform into stone golems slow down, print `<Mon> turns to stone.`, and use `monstone()` without hero kill credit.
- `nethack-c/upstream/src/mon.c:3309` through `:3356`: tiny petrified monsters use `rn2(2 + high-frequency bonus)`; failure creates a rock instead of a statue.
- `nethack-c/upstream/src/mthrowu.c:494` and `:170` through `:178`: hit eggs are deleted by `drop_throw(..., ohit=1)` and do not land.

## JS Changes

- `js/allmain.js`
  - Adds a localized monster `munstone()` equivalent for monster-thrown egg intervening hits.
  - Supports lizard/acidic corpse, openable lizard/acidic tin, acid potion, and slimeproof green-slime glob cure predicates.
  - Clears wait strategy, consumes one curing inventory object, applies the visible petrification slowdown message, and emits C-shaped consume plus `seems limber!` text.
  - Applies the same visible slowdown message before uncured intervening-monster instant petrification.
  - Changes intervening-monster egg petrification punctuation from `turns to stone!` to C's `turns to stone.`.
- `test/shop-billing-helpers.test.mjs`
  - Adds canaries for lizard-corpse self-cure and both tiny target `rn2(2)` outcomes.
  - Updates the existing intervening-monster egg stoning assertion for C punctuation.

## Tests

- `production monster cockatrice egg hit lets target eat lizard corpse before petrifying`
- `production monster cockatrice egg tiny target can crumble to rock`
- `production monster cockatrice egg tiny target can leave statue`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "production monster cockatrice egg|Kop cream pie forced iron bars|kobold dart aimed shot can clonk iron bars" test/shop-billing-helpers.test.mjs` - 12 pass, 2769 skipped
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Acid-potion cure stomach-damage death, openable-tin cure rows, and slimeproof green-slime glob cure rows still need focused canaries.
- C's ordinary physical egg hit damage after a successful `munstone()` cure is still not modeled in this branch.
- Cursed/greased monster-thrown egg misfire and sink/ordinary wall stop handling remain separate projectile slices.
