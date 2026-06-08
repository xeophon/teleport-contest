# C Parity Audit 786: Monster-Thrown Cockatrice Egg Munstone Acid and Tin Fallout

Implemented the next production monster-thrown petrifying egg intervening-monster `munstone()` fallout slice. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:373` through `:385`: intervening hits compute object damage before the visible egg `Splat!` message.
- `nethack-c/upstream/include/objects.h:1033` through `:1037` and `:1052`: `FOOD(...)` rows pass zero `sdam`/`ldam`; eggs therefore do not roll physical `dmgval()` damage despite the generic call site.
- `nethack-c/upstream/src/mthrowu.c:444` through `:447`: petrifying egg hits call `munstone(mtmp, FALSE)`, then zero any remaining damage for stone-resistant targets.
- `nethack-c/upstream/src/muse.c:2884` through `:2897`: `munstone()` rejects stone-resistant, eating, or helpless monsters, clears wait strategy, and scans inventory in order for a cure.
- `nethack-c/upstream/src/muse.c:2938` through `:2953`: acid potion self-cure consumes the potion first, applies `rnd(15)` stomach-acid damage to non-resistant monsters, and uses monster-death cleanup without hero credit on fatal damage.
- `nethack-c/upstream/src/muse.c:2985` through `:2996`: cure predicates include acid potion, slimeproof green-slime glob, lizard corpse/tin, and acidic corpse/tin.
- `nethack-c/upstream/src/muse.c:3006` through `:3020`: monsters can open tins only if non-animal and carrying a tin opener, dagger, or knife, subject to welded-weapon constraints.
- `nethack-c/upstream/src/mon.c:3173`, `:2777`, and `nethack-c/upstream/src/steal.c:892`: monster-death detachment drops remaining inventory but does not create a corpse on this acid self-cure path.

## JS Changes

- `js/allmain.js`
  - Extends monster acid resistance checks to include top-level `acidResistance`, `resistsAcid`, and `resists_acid` fields as well as monster-data fields.
  - Routes fatal acid self-cure through a dedicated detachment helper that records the death, drops remaining inventory, removes the monster, and intentionally skips corpse/glob creation.
  - Keeps monster-thrown petrifying eggs at zero physical HP damage after a successful cure, matching C's food-class egg `sdam`/`ldam` metadata.
- `test/shop-billing-helpers.test.mjs`
  - Adds canaries for no egg chip damage after lizard-corpse cure, fatal acid-potion cure, acid-resistant acid-potion cure, openable lizard tin, and stone-resistant slimeproof green-slime glob guard behavior.
  - Updates the lizard-corpse and tiny-remains canaries to remove the incorrect egg `rnd(1)` damage expectation.

## Tests

- `production monster cockatrice egg hit lets target eat lizard corpse before petrifying`
- `production monster cockatrice egg cured target takes no physical egg impact damage`
- `production monster cockatrice egg acid potion cure can kill target before petrifying`
- `production monster cockatrice egg acid resistant target quaffs acid without stomach damage`
- `production monster cockatrice egg target opens lizard tin with tin opener before petrifying`
- `production monster cockatrice egg stone-resistant slimeproof target keeps green slime glob`
- `production monster cockatrice egg tiny target can crumble to rock`
- `production monster cockatrice egg tiny target can leave statue`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster cockatrice egg" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broader acidic non-lizard corpse/tin species are covered in audit 787.
- Cursed/greased monster-thrown egg misfire and sink/ordinary wall stop handling remain separate projectile slices.
