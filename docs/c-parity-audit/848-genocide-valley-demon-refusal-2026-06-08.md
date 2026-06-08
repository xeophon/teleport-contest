# C Parity Audit 848: Genocide Valley Demon Refusal

Closed an ordinary genocide parser gap for C's valley-only demon rows. C resolves `water demon`, `horned devil`, `barbed devil`, and `erinys`, plus the explicit plural alias `erinyes`; all four targets are real monsters but lack `G_GENO`, so ordinary scroll genocide takes the divine refusal path. JS already had those rows available to level generation through `VALLEY_DEMON_ROWS`, but the genocide catalog did not expose them, so some inputs could be reported as nonexistent. `erinys` also needed a narrow normalization fix because the generic JS terminal-`s` rule treated the canonical singular as `eriny` and could allow a false wipeout.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed monster names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/read.c:2913` through `:2918`: resolved non-`G_GENO` monsters take the divine refusal path.
- `nethack-c/upstream/src/mondata.c:1018`: `name_to_monplus()` maps `erinyes` to `PM_ERINYS`.
- `nethack-c/upstream/src/mondata.c:1024` through `:1033`: alternate spelling rows accept only end, space, or apostrophe remainders.
- `nethack-c/upstream/include/monsters.h:2911` through `:2921`: `water demon` has `G_NOCORPSE | G_NOGEN` and lacks `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2939` through `:2948`: `horned devil` has no `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2950` through `:2960`: `erinys` has no `G_GENO`, with C noting the plural is `erinyes`.
- `nethack-c/upstream/include/monsters.h:2962` through `:2971`: `barbed devil` has no `G_GENO`.
- `js/mklev.js:5874`
  - JS already exposes these names to generation through `VALLEY_DEMON_ROWS`, and `monsterByRndName()` can reuse those rows for genocide lookup.

## JS Changes

- `js/cmd.js:31013`
  - Added `water demon`, `horned devil`, `erinys`, and `barbed devil` to the genocide extra-name catalog so lookup reuses existing `monsterByRndName()` data.
- `js/cmd.js:31017`
  - Marked the four valley-only demons as forbidden ordinary genocide targets, matching C's non-`G_GENO` divine refusal.
- `js/cmd.js:31031`
  - Added C's `erinyes` alias to `erinys`.
- `js/cmd.js:31094`
  - Preserved canonical `erinys` during normalization instead of singularizing it to `eriny`.
- `js/cmd.js:31151`
  - Added C's `erinys` -> `erinyes` pluralization.

## Tests

- `test/shop-billing-helpers.test.mjs:13922`
  - Added ordinary genocide canaries for `water demon`, `horned devil`, `barbed devil`, `erinys`, `erinyes`, regular plural inputs, and trailing corpse text, requiring divine refusal, retry mode, no nonexistent message, and no wipeout.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide resolves C valley-only demon names before G_GENO refusal|genocide resolves C djinni aliases before G_GENO refusal|genocide resolves C amorous demon aliases before G_GENO refusal|blessed genocide refuses generated C non-G_GENO demon class" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- C's other irregular plural aliases with trailing object text, such as `homunculi corpse` and `lurkers above corpse`, remain a separate slice.
