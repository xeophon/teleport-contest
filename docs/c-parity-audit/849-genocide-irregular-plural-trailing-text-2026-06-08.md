# C Parity Audit 849: Genocide Irregular Plural Trailing Text

Closed an ordinary genocide parser gap for C's irregular plural alternate rows when followed by trailing object text. JS already generated correct plural wipeout messages for singular inputs like `homunculus`, `violet fungus`, `mumak`, and `lurker above`, and exact plural inputs often resolved through the final candidate pass. C's `name_to_monplus()` also treats irregular plurals as alternate rows, so inputs like `homunculi corpse`, `violet fungi corpse`, and `lurkers above corpse` should resolve before the trailing object text. JS previously did not represent those alternate rows directly.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed monster names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/mondata.c:1006` through `:1018`: `name_to_monplus()` maps irregular plural aliases including `incubi`, `succubi`, `violet fungi`, `homunculi`, `baluchitheria`, `lurkers above`, `watchmen`, `mumakil`, and `erinyes`.
- `nethack-c/upstream/src/mondata.c:1024` through `:1033`: alternate spelling rows accept only end, space, or apostrophe remainders.
- `nethack-c/upstream/include/monsters.h:551`: `homunculus` is the canonical target for `homunculi`.
- `nethack-c/upstream/include/monsters.h:838`: `mumak` is the canonical target for `mumakil`.
- `nethack-c/upstream/include/monsters.h:870`: `baluchitherium` is the canonical target for `baluchitheria`.
- `nethack-c/upstream/include/monsters.h:981`: `lurker above` is the canonical target for `lurkers above`.
- `nethack-c/upstream/include/monsters.h:1668`: `violet fungus` is the canonical target for `violet fungi`.
- `nethack-c/upstream/include/monsters.h:2816`: `watchman` is the canonical target for `watchmen`.
- `nethack-c/upstream/include/monsters.h:2931`: `incubus` and `succubus` are gendered names for the non-`G_GENO` `amorous demon` target.

## JS Changes

- `js/cmd.js:31031`
  - Added C irregular plural alias rows for `incubi`, `succubi`, `violet fungi`, `homunculi`, `baluchitheria`, `lurkers above`, `watchmen`, and `mumakil`.

## Tests

- `test/shop-billing-helpers.test.mjs:13579`
  - Added ordinary genocide canaries for `homunculi corpse`, `violet fungi corpse`, `baluchitheria corpse`, `lurkers above corpse`, `watchmen corpse`, and `mumakil corpse`, requiring wipeout of the singular target and no nonexistent retry.
- `test/shop-billing-helpers.test.mjs:13863`
  - Extended the amorous demon alias refusal canary with `incubi corpse` and `succubi corpse`, requiring C's divine refusal path.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide resolves C irregular plural aliases with trailing object text|genocide resolves C amorous demon aliases before G_GENO refusal|genocide pluralizes homunculus with C one-off suffix|genocide pluralizes lurker above with C compound rule|genocide resolves C valley-only demon names before G_GENO refusal" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- C's `cavemen` and `cavewomen` aliases resolve to non-`G_GENO` `cave dweller`; that needs a separate slice because Caveman self-genocide ordering has role-specific behavior.
