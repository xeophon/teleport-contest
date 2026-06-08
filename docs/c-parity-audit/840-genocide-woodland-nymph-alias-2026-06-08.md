# C Parity Audit 840: Genocide Woodland Nymph Alias

Closed a normal genocide alternate-name gap for C's `woodland nymph` spelling. C maps it to canonical `wood nymph` through `name_to_monplus()`, and `wood nymph` is genocidable. JS already cataloged `wood nymph`, but rejected the longer woodland alias.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads a scroll of genocide in synthetic non-shop floor state and targets the C-backed alternate name directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/mondata.c:973` through `:976`: the alternate spelling table maps `woodland nymph` to `PM_WOOD_NYMPH`.
- `nethack-c/upstream/src/mondata.c:1024` through `:1033`: alternate spelling rows accept end, space, or apostrophe remainders.
- `nethack-c/upstream/include/monsters.h:702` through `:703`: `wood nymph` is a `G_GENO` monster.

## JS Changes

- `js/cmd.js:31028`
  - Added `woodland nymph` to `C_GENOCIDE_NAME_ALIASES` with target `wood nymph`.

## Tests

- `test/shop-billing-helpers.test.mjs:13722`
  - Extended the alternate-spelling genocide canary table with `woodland nymph`, requiring `Wiped out all wood nymphs.` and a canonical `wood nymph` genocided entry.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide accepts C alternate monster spellings|genocide rejects C alternate-spelling plural suffixes|genocide accepts C monster-name prefixes with trailing object text" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Other `name_to_monplus()` alternate rows, such as obsolete `high-elf` and potential-guess aliases, still need separate genocide coverage.
