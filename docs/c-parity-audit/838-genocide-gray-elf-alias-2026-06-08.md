# C Parity Audit 838: Genocide Gray-Elf Alias

Closed a normal genocide alternate-name gap for C's `gray-elf` and `gray elf` spellings. C maps both to the canonical `Grey-elf` monster through `name_to_monplus()` alternate rows, and `Grey-elf` is genocidable. JS only recognized the canonical `Grey-elf` / `grey elf` forms, so the gray spellings were rejected.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed alternate names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/mondata.c:946` through `:953`: the alternate spelling table maps `gray-elf` to `PM_GREY_ELF`.
- `nethack-c/upstream/src/mondata.c:996` through `:999`: the same table maps `gray elf` to `PM_GREY_ELF`.
- `nethack-c/upstream/include/monsters.h:2662` through `:2663`: `Grey-elf` is a `G_GENO` monster.
- `nethack-c/upstream/src/read.c:2955` through `:2966`: successful genocide prints `Wiped out all <makeplural(monster)>`.

## JS Changes

- `js/cmd.js:31028`
  - Added `gray-elf` and `gray elf` to `C_GENOCIDE_NAME_ALIASES` with target `Grey-elf`.
- `js/cmd.js:31104`
  - Added hyphenated `-elf` pluralization so `Grey-elf` wipes out as `Grey-elves`.

## Tests

- `test/shop-billing-helpers.test.mjs:13722`
  - Extended the alternate-spelling genocide canary table with `gray-elf` and `gray elf`, requiring `Wiped out all Grey-elves.` and a canonical `Grey-elf` genocided entry.
- `test/shop-billing-helpers.test.mjs:13779`
  - Extended the alternate-spelling plural rejection canary with `gray-elfs`, preserving C's alias-boundary behavior.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide accepts C alternate monster spellings|genocide rejects C alternate-spelling plural suffixes|genocide accepts C monster-name prefixes with trailing object text" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Other `name_to_monplus()` alternate rows, such as aligned/high cleric and outdated-name aliases, still need separate genocide coverage.
