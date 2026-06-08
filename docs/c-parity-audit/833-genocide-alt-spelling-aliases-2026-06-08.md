# C Parity Audit 833: Genocide Alternate Spelling Aliases

Closed a normal-genocide name-resolution gap for C's `alt_spl` monster aliases. C accepts alternate spellings such as `grey dragon`, `baby grey dragon`, `grey unicorn`, `grey ooze`, `mindflayer`, and `master mindflayer`, then resolves them to canonical normal-genocidable monster rows. JS previously only matched the canonical catalog spelling and could reject these inputs as nonexistent.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read ordinary scrolls of genocide in synthetic non-shop floor state and submit source-backed alternate names directly.

## Source Anchors

- `nethack-c/upstream/src/mondata.c:946` through `:954`: `name_to_monplus()` has `alt_spl` entries for `grey dragon`, `baby grey dragon`, `grey unicorn`, `grey ooze`, `mindflayer`, and `master mindflayer`.
- `nethack-c/upstream/src/read.c:2890`: ordinary genocide resolves the response with `name_to_mon()`.
- `nethack-c/upstream/include/monsters.h:521` and `:531`: `mind flayer` and `master mind flayer` both carry `G_GENO`.
- `nethack-c/upstream/include/monsters.h:1018`: `gray unicorn` carries `G_GENO`.
- `nethack-c/upstream/include/monsters.h:1341`: `baby gray dragon` carries `G_GENO`.
- `nethack-c/upstream/include/monsters.h:1432`: `gray dragon` carries `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2081`: `gray ooze` carries `G_GENO`.

## JS Changes

- `js/cmd.js:31020`
  - Added a narrow `C_GENOCIDE_NAME_ALIASES` map for the normal-genocidable C `alt_spl` aliases already represented by canonical JS catalog rows.
- `js/cmd.js:31091`
  - `genocideMonsterByName()` now checks the alias-resolved form alongside the raw normalized input.

## Tests

- `test/shop-billing-helpers.test.mjs:13707`
  - Added canaries for `grey dragon`, `baby grey dragon`, `grey unicorn`, `grey ooze`, `mindflayer`, and `master mindflayer`, requiring canonical `Wiped out all ...` messages and canonical `_genocided_monsters` entries.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide accepts C alternate monster spellings|genocide resolves C gendered neutral monster aliases|genocide resolves C amorous demon aliases" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name parser rather than C's full `name_to_monplus()` alias table. Non-genocidable C aliases remain separate eligibility/refusal candidates.
