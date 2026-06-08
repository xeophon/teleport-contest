# C Parity Audit 843: Genocide Collapsed Hyphen Aliases

Closed a normal genocide parser gap for C's collapsed hyphen spellings of lich and ki-rin names. C maps `master-lich` and `masterlich` to `master lich`, maps `archlich` to `arch-lich`, and maps `kirin` to `ki-rin` before applying ordinary genocide eligibility. JS previously rejected the collapsed forms as nonexistent.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed alternate names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/read.c:2913` through `:2918`: resolved non-`G_GENO` monsters take the divine refusal path.
- `nethack-c/upstream/src/mondata.c:967` through `:968`: `name_to_monplus()` maps `master-lich` and `masterlich` to `PM_MASTER_LICH`.
- `nethack-c/upstream/src/mondata.c:990` through `:1005`: the hyphenated-name alias block maps `kirin` to `PM_KI_RIN` and `archlich` to `PM_ARCH_LICH`.
- `nethack-c/upstream/src/mondata.c:1024` through `:1033`: alternate spelling rows accept end, space, or apostrophe remainders.
- `nethack-c/upstream/include/monsters.h:1244` through `:1245`: `ki-rin` lacks `G_GENO`.
- `nethack-c/upstream/include/monsters.h:1880` through `:1881`: `master lich` carries `G_GENO`.
- `nethack-c/upstream/include/monsters.h:1889` through `:1890`: `arch-lich` carries `G_GENO`.

## JS Changes

- `js/cmd.js:31028`
  - Added `master-lich`, `masterlich`, `kirin`, and `archlich` to `C_GENOCIDE_NAME_ALIASES`.

## Tests

- `test/shop-billing-helpers.test.mjs:13722`
  - Extended the alternate-spelling genocide canary table with `master-lich`, `masterlich`, and `archlich`, requiring canonical wipeout messages and canonical genocided entries.
- `test/shop-billing-helpers.test.mjs:13832`
  - Extended the non-`G_GENO` ki-rin refusal canary to cover both `ki-rin` and C's `kirin` alias, requiring divine refusal rather than a nonexistent-name retry.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide accepts C alternate monster spellings|genocide refuses C non-G_GENO ki-rin aliases|genocide rejects C alternate-spelling plural suffixes|genocide accepts C monster-name prefixes with trailing object text" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- C's space-separated hyphen aliases like `ki rin`, `uruk hai`, `orc captain`, `olog hai`, and `arch lich` still need a boundary-focused cleanup slice because JS already accepts some of them but is too permissive for plural suffixes.
- Priest title aliases still need a separate genocide refusal slice.
