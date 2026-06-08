# C Parity Audit 788: Monster-Thrown Cockatrice Egg Tin Opener Eligibility

Implemented the next production monster-thrown petrifying egg `munstone()` tin/opener eligibility slice. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/src/muse.c:2895` through `:2897`: `munstone()` computes `tinok = mcould_eat_tin(mon)` once before scanning monster inventory for the first qualifying cure.
- `nethack-c/upstream/src/muse.c:2991` through `:2997`: `cures_stoning()` accepts tins only when `tinok` is true, rejects empty/special tins, and then requires lizard or acidic contents.
- `nethack-c/upstream/src/muse.c:3006` through `:3008`: animals cannot open tins even if carrying an opener.
- `nethack-c/upstream/src/muse.c:3011` through `:3021`: monster tin openers need not be wielded unless the monster is welded to a wielded item; recognized opener items are `TIN_OPENER` or weapon-class `P_DAGGER`/`P_KNIFE`.
- `nethack-c/upstream/include/objects.h:200` through `:233` and `:961`: upstream dagger/knife/tin-opener object rows include dagger, elven dagger, orcish dagger, silver dagger, athame, scalpel, knife, stiletto, worm tooth, crysknife, and tin opener.
- `js/cmd.js:28842`: local tin generation can represent monster tins as `kind: "tin:<name>"` with `actualKind: "tin"`.

## JS Changes

- `js/allmain.js`
  - Recognizes `kind: "tin:<species>"` and `actualKind: "tin"` as tins for monster `munstone()` cure selection, and parses encoded tin species when `corpsenm` metadata is absent.
  - Recognizes numeric `TIN_OPENER` objects as openers even without string metadata.
  - Replaces broad substring opener matching with a C-shaped dagger/knife opener predicate using known object IDs plus exact weapon-kind names.
  - Adds welded wielded-weapon gating: a cursed/explicitly welded monster weapon limits opener eligibility to that weapon, so a welded non-opener blocks other carried openers while a welded dagger/knife can still open tins.
- `test/shop-billing-helpers.test.mjs`
  - Adds production canaries for `tin:<species>` plus numeric-only tin opener, animal tin-open rejection, cursed wielded non-opener blocking a later opener, and cursed wielded dagger still opening a tin.

## Tests

- `production monster cockatrice egg target opens species tin with numeric tin opener`
- `production monster cockatrice egg animal target cannot open lizard tin`
- `production monster cockatrice egg cursed wielded non-opener blocks tin opener`
- `production monster cockatrice egg cursed wielded dagger opens lizard tin`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster cockatrice egg (target opens species tin|animal target cannot open|cursed wielded non-opener|cursed wielded dagger|target opens lizard tin|target opens acidic tin)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster (cockatrice egg|Kop|dart)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Cursed/greased monster-thrown egg misfire and sink/ordinary wall stop handling are covered in audit 789.
