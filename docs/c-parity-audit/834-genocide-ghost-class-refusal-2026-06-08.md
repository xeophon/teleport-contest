# C Parity Audit 834: Genocide Ghost Class Refusal

Closed a blessed class-genocide membership gap for the ghost class. C recognizes `ghost` as a monster class containing `ghost` and `shade`, but neither member carries `G_GENO`; blessed class genocide therefore refuses the class with `You aren't permitted to genocide such monsters.` JS already mapped the class name `ghost` to the space glyph, but its genocide catalog had no ghost-class members, so it could report that the response did not represent any monster.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read scrolls of genocide in synthetic non-shop floor state and target source-backed ghost names/classes directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2685` through `:2697`: `do_class_genocide()` resolves class input and counts members by exact `mons[i].mlet == class`.
- `nethack-c/upstream/src/read.c:2699` through `:2705`: if a class has no genocidable members but has immune members, C prints `You aren't permitted to genocide such monsters.`
- `nethack-c/upstream/src/read.c:2890` through `:2913`: ordinary genocide resolves named monsters and then applies the non-`G_GENO` divine refusal.
- `nethack-c/upstream/include/monsters.h:2888` through `:2896`: `ghost` is `S_GHOST` and lacks `G_GENO`.
- `nethack-c/upstream/include/monsters.h:2897` through `:2907`: `shade` is also `S_GHOST` and lacks `G_GENO`.

## JS Changes

- `js/cmd.js:31001`
  - Added supplemental ghost and shade catalog rows with the space monster class glyph.
- `js/cmd.js:31009`
  - Added `ghost` and `shade` to the genocide-forbidden set so named and class genocide use C's refusal paths.

## Tests

- `test/shop-billing-helpers.test.mjs:13770`
  - Added named-genocide canaries for `ghost` and `shade`, requiring the C divine refusal rather than nonexistent-monster text.
- `test/shop-billing-helpers.test.mjs:13808`
  - Added a blessed class-genocide canary for input `ghost`, requiring class permission refusal, a reprompt, and no wipeout.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide refuses C non-G_GENO ghost family|blessed genocide refuses C non-G_GENO ghost class|blessed genocide refuses C non-G_GENO angel class|genocide refuses C non-G_GENO ki-rin" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Other class names backed only by non-random or non-`G_GENO` C rows may still need supplemental catalog membership before JS can distinguish "known but forbidden" from "not a monster class."
