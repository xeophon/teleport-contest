# C Parity Audit 771: Direct Melee Acid Jelly Passive Fallback

## Sources

- `nethack-c/upstream/src/uhitm.c:5865-6017`: direct passive handling finds the defender's `AT_NONE` attack, and object-affecting passives run for successful hits even if the defender dies.
- `nethack-c/upstream/src/uhitm.c:6127-6184`: `passive_obj()` applies `AD_ACID` corrosion to the attacking object behind a 1-in-6 gate.
- `nethack-c/upstream/include/monsters.h:137-146`: acid blobs have passive `AT_NONE/AD_ACID`.
- `nethack-c/upstream/include/monsters.h:601-620`: spotted jellies and ochre jellies also carry passive `AT_NONE/AD_ACID`.
- `nethack-c/upstream/include/monsters.h:1641-1650`: green molds have passive `AT_NONE/AD_ACID`.

## JS Changes

- Extended the production-name passive-object fallback map so `spotted jelly` and `ochre jelly` resolve to the existing acid passive object corrosion path.
- Kept the shared direct passive object machinery unchanged; this slice only fills the missing C monster-data fallback for generated monsters that do not carry explicit attack metadata.

## Tests

Added focused command-path coverage in `test/shop-billing-helpers.test.mjs`:

- direct melee against a generated-name spotted jelly corrodes a wielded dagger through the fallback map;
- direct melee against a generated-name ochre jelly does the same;
- the test drives the C-shaped direct-hit RNG order explicitly instead of relying on a replay seed.

## Remaining Gaps

- The broader object registry should eventually generate full attack metadata instead of relying on per-name passive fallbacks.
- Worn-glove `AD_ENCH` fallback remains implemented but still lacks command-path coverage.
- Wielded potion and ordinary egg bash survivor wake/anger tails remain separate direct delivery work.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee acid-passive jelly fallback" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "direct hero melee acid-passive jelly fallback|direct hero melee against acid passive can corrode|direct hero melee against fire passive can burn|direct hero melee against rust monster rusts|direct hero melee against black pudding corrodes" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44`)
