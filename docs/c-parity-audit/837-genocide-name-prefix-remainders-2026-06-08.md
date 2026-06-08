# C Parity Audit 837: Genocide Name Prefix Remainders

Closed an ordinary genocide parser gap where C accepts a valid monster name followed by trailing text, while JS previously required the whole normalized response to equal a monster candidate. This matters for inputs like `ettin zombie corpse`: C ignores the trailing object text and deliberately chooses the longest matching monster-name prefix, so the target is `ettin zombie`, not `ettin`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and exercise C-backed parser inputs directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2862` through `:2890`: ordinary genocide trims the response with `mungspaces()` and resolves it through `name_to_mon()`.
- `nethack-c/upstream/src/read.c:2891` through `:2913`: unresolved names retry with `Such creatures do not exist in this world.` before genocide eligibility checks.
- `nethack-c/upstream/src/mondata.c:898` through `:908`: `name_to_monplus()` documents trailing text and longest monster-name prefix matching.
- `nethack-c/upstream/src/mondata.c:1024` through `:1033`: alternate spelling rows accept only end, space, or apostrophe after the alias.
- `nethack-c/upstream/src/mondata.c:1038` through `:1067`: canonical monster names scan for the longest prefix and allow C's `s`, `es`, and possessive boundaries.

## JS Changes

- `js/cmd.js:31066`
  - Added C-style genocide prefix input normalization for the parser path.
- `js/cmd.js:31080`
  - Added separate alternate-name and canonical-name remainder boundary checks.
- `js/cmd.js:31141`
  - Updated `genocideMonsterByName()` to resolve alternate spellings through C alias boundaries, then choose the longest canonical prefix match before falling back to exact normalized candidates.

## Tests

- `test/shop-billing-helpers.test.mjs:13749`
  - Added ordinary genocide canaries for `newt corpse`, `ettin zombie corpse`, `grid bugs corpse`, `grid bug's corpse`, and `grey dragon corpse`.
- `test/shop-billing-helpers.test.mjs:13777`
  - Added a rejection canary for `grey dragons`, preserving C's rule that alternate spelling aliases do not accept `s`/`es` plural suffix boundaries.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide accepts C alternate monster spellings|genocide accepts C monster-name prefixes with trailing object text|genocide rejects C alternate-spelling plural suffixes|genocide resolves C amorous demon aliases before G_GENO refusal" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The JS alias table still only models the alternate names currently covered by genocide canaries; C has more `name_to_monplus()` alternate rows used by other commands.
