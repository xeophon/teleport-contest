# C Parity Audit 845: Genocide Hyphenated Alias Boundaries

Closed a normal genocide parser gap for C's remaining hyphenated-name alternate rows. C accepts space-separated aliases like `uruk hai`, `orc captain`, `green elf`, `elf noble`, `olog hai`, and `arch lich`, but alternate rows only match at end, space, or apostrophe boundaries. JS previously generated space forms from canonical hyphenated names, which made those alternates inherit canonical plural suffix handling and accept forms C rejects, such as `uruk hais` and `arch liches`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed monster names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/mondata.c:936` through `:941`: C pre-normalizes `ies` and `ves` before alternate-name lookup.
- `nethack-c/upstream/src/mondata.c:990` through `:1005`: the hyphenated-name alternate block maps `ki rin`, `uruk hai`, `orc captain`, `woodland elf`, `green elf`, `grey elf`, `gray elf`, `elf lady`, `elf lord`, `elf noble`, `olog hai`, and `arch lich`.
- `nethack-c/upstream/src/mondata.c:1024` through `:1033`: alternate rows only accept end, space, or apostrophe remainders.
- `nethack-c/upstream/src/mondata.c:1038` through `:1067`: after alternate lookup, canonical monster names still use C's broader prefix and plural-suffix rules.
- `nethack-c/upstream/include/monsters.h:770` through `:789`: `Uruk-hai` and `orc-captain` carry `G_GENO`.
- `nethack-c/upstream/include/monsters.h:1889` through `:1890`: `arch-lich` carries `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2258` through `:2259`: `Olog-hai` carries `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2646` through `:2671`: woodland, green, grey, and noble elf targets carry `G_GENO`.

## JS Changes

- `js/cmd.js:31031`
  - Added explicit C alternate rows for `ki rin`, `uruk hai`, `orc captain`, `woodland elf`, `green elf`, `grey elf`, `elf lady`, `elf lord`, `elf noble`, `olog hai`, and `arch lich`.
- `js/cmd.js:31192`
  - Removed generated hyphen-to-space candidates from canonical prefix matching so space aliases use C's stricter alternate-row boundary rules.
- `js/cmd.js:31207`
  - Removed generated hyphen-to-space candidates from exact/plural matching for the same boundary reason.

## Tests

- `test/shop-billing-helpers.test.mjs:13722`
  - Extended the alternate-spelling genocide canary table with the remaining C hyphenated-name aliases, accepted `ves` singularization cases, and canonical wipeout assertions.
- `test/shop-billing-helpers.test.mjs:13774`
  - Added a trailing-object canary for `arch lich corpse`, matching C's alternate-row space remainder behavior.
- `test/shop-billing-helpers.test.mjs:13803`
  - Added rejected plural-suffix canaries for alternate rows that cannot fall back to shorter canonical monster names.
- `test/shop-billing-helpers.test.mjs:13854`
  - Extended the non-`G_GENO` ki-rin refusal canary with `ki rin`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide accepts C alternate monster spellings|genocide accepts C monster-name prefixes with trailing object text|genocide rejects C alternate-spelling plural suffixes|genocide refuses C non-G_GENO ki-rin aliases" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- C's `name_to_monplus()` table still has non-genocide aliases such as `genie` and title rows like `master thief` / `master of assassin` that need separate eligibility checks before changing JS genocide behavior.
