# C Parity Audit 846: Genocide Djinni Alias Refusal

Closed an ordinary genocide parser gap for C's `djinni` aliases. C maps `genie` and `djinn` to `djinni`; `djinni` is a real monster but lacks `G_GENO`, so ordinary scroll genocide takes the divine refusal path. JS previously had the `djinni` data available to level generation and lamp handling, but the genocide catalog did not expose it, so `djinni`, `genie`, and `djinn` could be reported as nonexistent.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed monster names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/read.c:2913` through `:2918`: resolved non-`G_GENO` monsters take the divine refusal path.
- `nethack-c/upstream/src/mondata.c:936` through `:941`: C pre-normalizes terminal `ies` and `ves` before alternate-name lookup.
- `nethack-c/upstream/src/mondata.c:979`: `name_to_monplus()` maps `genie` to `PM_DJINNI`.
- `nethack-c/upstream/src/mondata.c:1016`: `name_to_monplus()` maps `djinn` to `PM_DJINNI`.
- `nethack-c/upstream/src/mondata.c:1024` through `:1033`: alternate spelling rows accept only end, space, or apostrophe remainders.
- `nethack-c/upstream/src/mondata.c:1038` through `:1067`: canonical monster names use C's broader prefix and plural-suffix rules.
- `nethack-c/upstream/include/monsters.h:3187` through `:3194`: `djinni` has plural `djinn`, carries `G_NOGEN | G_NOCORPSE`, and lacks `G_GENO`.

## JS Changes

- `js/cmd.js:31013`
  - Added `djinni` to the genocide extra-name catalog so lookup reuses the existing `monsterByRndName('djinni')` data.
- `js/cmd.js:31017`
  - Marked `djinni` as forbidden for ordinary genocide, matching C's non-`G_GENO` divine refusal.
- `js/cmd.js:31031`
  - Added C alternate rows mapping `genie` and `djinn` to `djinni`.

## Tests

- `test/shop-billing-helpers.test.mjs:13803`
  - Added false-plural rejection canaries for `genies`, `genies corpse`, `djinns`, and `djinnies`, requiring C's nonexistent retry rather than wipeout or divine refusal.
- `test/shop-billing-helpers.test.mjs:13856`
  - Added ordinary genocide canaries for canonical `djinni`, the `genie` and `djinn` aliases, trailing corpse text, possessive corpse text, `djinnis`, and `djinnies corpse`, requiring divine refusal, retry mode, no nonexistent message, and no wipeout.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide resolves C djinni aliases before G_GENO refusal|genocide rejects C alternate-spelling plural suffixes|genocide resolves C amorous demon aliases before G_GENO refusal|genocide refuses C non-G_GENO ki-rin aliases" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- C's `name_to_monplus()` still has title aliases such as `master thief` and `master of assassin` that need separate eligibility checks before changing JS genocide behavior.
