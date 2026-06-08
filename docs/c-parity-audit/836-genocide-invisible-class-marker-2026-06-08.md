# C Parity Audit 836: Genocide Invisible Class Marker

Closed a blessed class-genocide prompt mismatch for C's special invisible-monster marker. In C, a single `I` is parsed as `S_invisible`, which is not a real monster class but is still recognized well enough for `do_class_genocide()` to refuse it with the permission message. JS previously treated `I` as an unknown empty class and reported that the symbol did not represent any monster.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads a blessed scroll of genocide in synthetic non-shop floor state and targets the C-backed invisible marker directly.

## Source Anchors

- `nethack-c/upstream/src/mondata.c:1128` through `:1138`: a one-character `I` maps to `S_invisible`.
- `nethack-c/upstream/include/defsym.h:336`: `S_invisible` uses symbol `I` and explanation text `invisible monster`.
- `nethack-c/upstream/src/read.c:2699` through `:2703`: `do_class_genocide()` treats `S_invisible` as a recognized class marker that is not permitted to genocide.

## JS Changes

- `js/cmd.js:31544`
  - Added an early class-genocide refusal for `cls === 'I'` before empty class membership is reported as an unknown symbol or response.
- `js/cmd.js:48404`
  - Added `invisible` and `invisible monster` class-name aliases resolving to `I`.

## Tests

- `test/shop-billing-helpers.test.mjs:13842`
  - Added a blessed genocide canary for `I` and `invisible monster`, requiring `You aren't permitted to genocide such monsters.` and a continued class-genocide prompt.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "blessed genocide refuses C invisible class marker|blessed genocide refuses C non-G_GENO angel class|blessed genocide refuses C non-G_GENO ghost class" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- C's monster-name parser accepts valid monster names followed by trailing object text. JS still needs that longer parser parity pass.
