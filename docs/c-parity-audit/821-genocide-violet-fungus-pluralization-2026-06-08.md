# C Parity Audit 821: Genocide Violet Fungus Pluralization

Closed another genocide monster-name pluralization gap. C's `makeplural()` applies its `fungus -> fungi` one-off as a suffix replacement, so normal genocide prints `violet fungi`. JS previously only handled the exact name `fungus` and could fall through to `violet funguses`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads an ordinary scroll of genocide in synthetic non-shop floor state and targets the catalog monster name directly.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:1668` through `:1669`: `violet fungus` is a genocidable `S_FUNGUS` monster.
- `nethack-c/upstream/src/read.c:2913`: normal genocide rejects monsters without `G_GENO`, so this row is eligible.
- `nethack-c/upstream/src/read.c:2936` and `:2966`: normal genocide sets the `all` wording and prints the selected monster through `makeplural()` for the `Wiped out all ...` form.
- `nethack-c/upstream/src/objnam.c:2671`: C's `one_off[]` maps `fungus` to `fungi`.
- `nethack-c/upstream/src/objnam.c:2912`: `makeplural()` applies `singplur_lookup()` to the matched suffix before the generic fallback rules.
- `js/monster_data.js:163`: local generated monster metadata includes `violet fungus` in the genocide catalog source.

## JS Changes

- `js/cmd.js:31025`
  - Extended `pluralizeMonsterName()` so names ending in `fungus` pluralize with the C suffix form `fungi`.

## Tests

- `test/shop-billing-helpers.test.mjs:13538`
  - Added a normal scroll-of-genocide canary for `violet fungus`, requiring `Wiped out all violet fungi.` and rejecting `violet funguses`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "genocide pluralizes homunculus|genocide pluralizes baluchitherium|genocide pluralizes violet fungus|genocide cleanup drops worn life saving amulet from nonliving steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name pluralizer rather than the full C `makeplural()` implementation. Other source-backed suffixes and `one_off[]` monster names remain separate candidates.
