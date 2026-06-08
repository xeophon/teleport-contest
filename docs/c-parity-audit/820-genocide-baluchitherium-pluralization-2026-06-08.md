# C Parity Audit 820: Genocide Baluchitherium Pluralization

Closed another genocide monster-name pluralization gap. C's `makeplural()` maps `ium` endings to `ia`, with the source comment naming `baluchitheria`; JS previously fell through to the default `+s` path and could report `baluchitheriums`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads an ordinary scroll of genocide in synthetic non-shop floor state and targets the catalog monster name directly.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:870` through `:871`: `baluchitherium` is a genocidable `S_QUADRUPED` monster.
- `nethack-c/upstream/src/read.c:2955` through `:2966`: normal genocide prints the selected monster type through `makeplural()` for the `Wiped out all ...` form.
- `nethack-c/upstream/src/objnam.c:2939` through `:2942`: `makeplural()` maps `ium` endings to `ia`, with the comment naming `mycelia` and `baluchitheria`.
- `js/monster_data.js:87`: local generated monster metadata includes `baluchitherium` in the genocide catalog source.

## JS Changes

- `js/cmd.js:31025`
  - Extended `pluralizeMonsterName()` with the C `ium -> ia` suffix rule before the default fallback.

## Tests

- `test/shop-billing-helpers.test.mjs:13524`
  - Added a normal scroll-of-genocide canary for `baluchitherium`, requiring `Wiped out all baluchitheria.` and rejecting `baluchitheriums`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "genocide pluralizes homunculus|genocide pluralizes baluchitherium|genocide cleanup drops worn life saving amulet from nonliving steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name pluralizer rather than the full C `makeplural()` implementation. Other source-backed suffixes and `one_off[]` monster names remain separate candidates.
