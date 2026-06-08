# C Parity Audit 841: Genocide Obsolete Name Aliases

Closed a normal genocide alternate-name gap for C's `halfling`, `invisible stalker`, and `high-elf` rows. C maps these through `name_to_monplus()` to canonical `hobbit`, `stalker`, and `elven monarch`; all three targets are `G_GENO` monsters. JS already cataloged those canonical monsters, but rejected the C alternate names.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed alternate names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/mondata.c:970` through `:978`: the alternate spelling table maps `invisible stalker`, `high-elf`, and `halfling` to their canonical monster IDs.
- `nethack-c/upstream/include/monsters.h:477` through `:478`: `hobbit` is a `G_GENO` monster.
- `nethack-c/upstream/include/monsters.h:1566` through `:1567`: `stalker` is a `G_GENO` monster.
- `nethack-c/upstream/include/monsters.h:2679` through `:2680`: `elven monarch` is a `G_GENO` monster.
- `nethack-c/upstream/src/read.c:2955` through `:2966`: successful genocide prints `Wiped out all <makeplural(monster)>`.

## JS Changes

- `js/cmd.js:31028`
  - Added `halfling`, `invisible stalker`, and `high-elf` to `C_GENOCIDE_NAME_ALIASES`.
- `js/cmd.js:31110`
  - Added `monarch` pluralization so `elven monarch` wipes out as `elven monarchs`, matching the C visible message.

## Tests

- `test/shop-billing-helpers.test.mjs:13722`
  - Extended the alternate-spelling genocide canary table with `halfling`, `invisible stalker`, and `high-elf`, requiring canonical wipeout messages and canonical genocided entries.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide accepts C alternate monster spellings|genocide rejects C alternate-spelling plural suffixes|genocide accepts C monster-name prefixes with trailing object text" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Non-`G_GENO` alternate rows like `genie` -> `djinni` and title/lycanthrope aliases still need separate coverage.
