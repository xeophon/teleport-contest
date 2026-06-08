# C Parity Audit 842: Genocide Lycanthrope Alias Refusal

Closed an ordinary genocide parser gap for C's lycanthrope disambiguation aliases. C maps `human wererat`, `human werejackal`, `human werewolf`, `rat wererat`, `jackal werejackal`, and `wolf werewolf` through `name_to_monplus()` to werebeast monster entries, then refuses genocide because those entries are not `G_GENO`. JS previously lacked those alias rows; some inputs were reported nonexistent, and `jackal werejackal` / `wolf werewolf` could resolve the ordinary animal prefix and wipe out the wrong species.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target C-backed lycanthrope aliases directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2893`: ordinary genocide resolves input through `name_to_mon()` and retries unresolved names.
- `nethack-c/upstream/src/read.c:2913` through `:2918`: resolved non-`G_GENO` monsters take the divine refusal path.
- `nethack-c/upstream/src/mondata.c:981` through `:989`: `name_to_monplus()` maps the six lycanthrope disambiguation aliases.
- `nethack-c/upstream/src/mondata.c:1024` through `:1033`: alternate spelling rows accept end, space, or apostrophe remainders.
- `nethack-c/upstream/include/monsters.h:220` through `:221`: animal `werejackal` lacks `G_GENO`.
- `nethack-c/upstream/include/monsters.h:267` through `:268`: animal `werewolf` lacks `G_GENO`.
- `nethack-c/upstream/include/monsters.h:911` through `:912`: animal `wererat` lacks `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2609` through `:2626`: human-form lycanthropes also lack `G_GENO`.

## JS Changes

- `js/cmd.js:31028`
  - Added C lycanthrope disambiguation aliases to `C_GENOCIDE_NAME_ALIASES`, targeting the already-forbidden `wererat`, `werejackal`, and `werewolf` names.

## Tests

- `test/shop-billing-helpers.test.mjs:14040`
  - Added a normal genocide canary table for all six C aliases, requiring divine refusal, rejecting nonexistent/wipeout messages, and guarding against accidental `jackal` / `wolf` genocide.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide resolves C lycanthrope disambiguation aliases before refusal|genocide refuses remaining generated C non-G_GENO common monsters|genocide accepts C monster-name prefixes with trailing object text" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Priest title aliases and collapsed hyphen aliases still need separate genocide parity slices.
