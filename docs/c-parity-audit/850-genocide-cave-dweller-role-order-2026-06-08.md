# C Parity Audit 850: Genocide Cave Dweller Role Order

Closed an ordinary genocide parser gap for C's `cave dweller` role monster aliases. C maps the gendered names `caveman` and `cavewoman` to the canonical `cave dweller`, and maps irregular plurals `cavemen` and `cavewomen` through `name_to_monplus()`. The target lacks `G_GENO`, so non-Caveman roles get divine refusal. However, C checks `Your_Own_Role()` and `Your_Own_Race()` before the non-`G_GENO` refusal, so a Caveman/Cavewoman genociding `cave dweller` follows the self-genocide death path instead of being refused.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed monster names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/read.c:2904` through `:2907`: C checks own role/race and sets `killplayer` before the non-`G_GENO` refusal.
- `nethack-c/upstream/src/read.c:2913` through `:2918`: resolved non-`G_GENO` monsters otherwise take the divine refusal path.
- `nethack-c/upstream/src/read.c:2983` through `:3004`: successful self-genocide marks the species genocided, prints wipeout text, and kills or delays the hero.
- `nethack-c/upstream/src/mondata.c:1013` through `:1014`: `name_to_monplus()` maps `cavemen` and `cavewomen` to `PM_CAVE_DWELLER`.
- `nethack-c/upstream/include/monsters.h:3361` through `:3369`: `caveman`, `cavewoman`, and `cave dweller` are gendered names for one `G_NOGEN` monster lacking `G_GENO`.
- `nethack-c/upstream/src/role.c:113` through `:127`: the Caveman/Cavewoman role uses `PM_CAVE_DWELLER` as its role monster.

## JS Changes

- `js/cmd.js:27215`
  - Added `cave dweller` gendered names so genocide lookup resolves `caveman`, `cavewoman`, and trailing object text through the existing gendered-name candidate path.
- `js/cmd.js:31001`
  - Added a genocide-only catalog row for `cave dweller`.
- `js/cmd.js:31017`
  - Marked `cave dweller` as forbidden for ordinary non-role genocide, matching C's non-`G_GENO` divine refusal.
- `js/cmd.js:31031`
  - Added C irregular plural aliases `cavemen` and `cavewomen`.
- `js/cmd.js:31398`
  - Added resolved-target hero matching so gendered role targets such as `cave dweller` can trigger self-genocide before forbidden refusal without changing unrelated forbidden monsters.
- `js/cmd.js:31684`
  - Moved ordinary forbidden refusal behind the resolved-target self-genocide check, matching C's ordering for own role/race.

## Tests

- `test/shop-billing-helpers.test.mjs:13406`
  - Added a Caveman canary for `cavemen`, requiring wipeout of `cave dweller`, death prompt setup, no divine refusal, and no replay-specific branches.
- `test/shop-billing-helpers.test.mjs:13429`
  - Added a polymorphed Caveman canary for `cave dweller`, requiring delayed self-genocide, no divine refusal, and no immediate death while still in monster form.
- `test/shop-billing-helpers.test.mjs:14005`
  - Added non-Caveman canaries for `caveman`, `cavewoman`, `cave dweller`, `cavemen`, `cavewomen`, and trailing corpse text, requiring divine refusal, retry mode, no nonexistent message, and no wipeout.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "caveman role genocide of cave dweller follows C self-genocide before refusal|polymorphed caveman role genocide of cave dweller delays death before refusal|genocide resolves C cave dweller aliases before G_GENO refusal for other roles|self-genocide consumes life saving but still dies|genocide resolves C irregular plural aliases with trailing object text" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broad `title_to_mon()` rank-title fallback remains intentionally out of scope.
