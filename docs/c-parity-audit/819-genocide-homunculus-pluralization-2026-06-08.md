# C Parity Audit 819: Genocide Homunculus Pluralization

Closed another compact genocide monster-name pluralization gap. C's `makeplural()` explicitly supports `homunculus -> homunculi`; JS previously fell through to the generic `s -> ses` branch and could report `homunculuses`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads an ordinary scroll of genocide in synthetic non-shop floor state and targets the catalog monster name directly.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:551` through `:552`: `homunculus` is a genocidable `S_IMP` monster.
- `nethack-c/upstream/src/read.c:2955` through `:2966`: normal genocide prints the selected monster type through `makeplural()` for the `Wiped out all ...` form.
- `nethack-c/upstream/src/objnam.c:2665` through `:2666`: `one_off[]` contains `cubus -> cubi` and `culus -> culi`, with the latter documented for `homunculus`.
- `nethack-c/upstream/src/objnam.c:2825` through `:2836`: `makeplural()` is explicitly documented as used for monster names, including `Wiped out all homunculi.`.
- `nethack-c/upstream/src/objnam.c:2911` through `:2913`: `makeplural()` applies `singplur_lookup(..., TRUE, ...)` before the generic suffix fallbacks.
- `nethack-c/upstream/src/objnam.c:2954` through `:2959`: the later generic `us -> i` branch also documents `homunculus/homunculi`, while preserving `lotus` and `wumpus` exceptions.

## JS Changes

- `js/cmd.js:31025`
  - Extended `pluralizeMonsterName()` with a source-backed `culus -> culi` suffix rule before the existing generic `s/x/z/ch/sh -> es` fallback.

## Tests

- `test/shop-billing-helpers.test.mjs:13510`
  - Added a normal scroll-of-genocide canary for `homunculus`, requiring `Wiped out all homunculi.` and rejecting `homunculuses`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "genocide pluralizes homunculus|genocide cleanup drops worn life saving amulet from nonliving steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name pluralizer rather than the full C `makeplural()` implementation. Other source-backed suffixes such as `cubus -> cubi`, `ium -> ia`, and selected `one_off[]` monster names remain separate candidates.
