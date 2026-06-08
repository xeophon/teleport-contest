# C Parity Audit 839: Genocide Wood-Elf Alias

Closed a normal genocide alternate-name gap for C's `wood-elf` and `wood elf` spellings. C maps both names to canonical `Woodland-elf` through `name_to_monplus()` alternate rows, and `Woodland-elf` is genocidable. JS already accepted the canonical `Woodland-elf` and `woodland elf` forms, but rejected the shorter wood-elf spellings.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed alternate names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/mondata.c:974` through `:975`: the alternate spelling table maps `wood-elf` and `wood elf` to `PM_WOODLAND_ELF`.
- `nethack-c/upstream/include/monsters.h:2646` through `:2647`: `Woodland-elf` is a `G_GENO` monster.
- `nethack-c/upstream/src/read.c:2955` through `:2966`: successful genocide prints `Wiped out all <makeplural(monster)>`.

## JS Changes

- `js/cmd.js:31028`
  - Added `wood-elf` and `wood elf` to `C_GENOCIDE_NAME_ALIASES` with target `Woodland-elf`.

## Tests

- `test/shop-billing-helpers.test.mjs:13722`
  - Extended the alternate-spelling genocide canary table with `wood-elf` and `wood elf`, requiring `Wiped out all Woodland-elves.` and a canonical `Woodland-elf` genocided entry.

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
