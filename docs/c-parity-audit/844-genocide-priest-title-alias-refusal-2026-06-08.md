# C Parity Audit 844: Genocide Priest Title Alias Refusal

Closed an ordinary genocide parser gap for C's temple priest title aliases. C maps `aligned priest` and `aligned priestess` to `aligned cleric`, and maps `high priest` and `high priestess` to `high cleric`; both targets resolve to real monsters but lack `G_GENO`, so ordinary scroll genocide takes the divine refusal path. JS previously lacked genocide catalog rows for those cleric targets and could report the title names as nonexistent.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed priest names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/read.c:2913` through `:2918`: resolved non-`G_GENO` monsters take the divine refusal path.
- `nethack-c/upstream/src/mondata.c:955` through `:960`: `name_to_monplus()` maps `aligned priest`, `aligned priestess`, `high priest`, and `high priestess` to cleric monster IDs.
- `nethack-c/upstream/src/mondata.c:1024` through `:1033`: alternate spelling rows accept end, space, or apostrophe remainders.
- `nethack-c/upstream/include/monsters.h:2749` through `:2757`: `aligned cleric` is `G_NOGEN` and lacks `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2760` through `:2771`: `high cleric` is `G_NOGEN | G_UNIQ` and lacks `G_GENO`.

## JS Changes

- `js/cmd.js:31001`
  - Added genocide-only catalog rows for `aligned cleric` and `high cleric`, matching the existing C-backed monster metadata used elsewhere in JS.
- `js/cmd.js:31017`
  - Marked `aligned cleric` and `high cleric` as forbidden genocide targets.
- `js/cmd.js:31031`
  - Added C title aliases from `aligned priest` / `aligned priestess` to `aligned cleric`, and `high priest` / `high priestess` to `high cleric`.

## Tests

- `test/shop-billing-helpers.test.mjs:13876`
  - Added an ordinary genocide canary table covering canonical `aligned cleric` / `high cleric` names and the four C priest title aliases, requiring divine refusal, retry mode, no nonexistent message, and no wipeout.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide resolves C priest title aliases before G_GENO refusal|genocide refuses C non-G_GENO ghost family|genocide resolves C lycanthrope disambiguation aliases before refusal|genocide accepts C alternate monster spellings" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Space-separated hyphen aliases like `ki rin`, `uruk hai`, `orc captain`, `olog hai`, and `arch lich` still need a boundary-focused cleanup slice.
