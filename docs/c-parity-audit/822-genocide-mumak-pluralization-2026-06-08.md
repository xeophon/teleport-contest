# C Parity Audit 822: Genocide Mumak Pluralization

Closed another genocide monster-name pluralization gap. C's `makeplural()` maps `mumak` to `mumakil` through `one_off[]`; JS previously fell through to the default `+s` path and could report `mumaks`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads an ordinary scroll of genocide in synthetic non-shop floor state and targets the catalog monster name directly.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:838` through `:840`: `mumak` is a genocidable `S_QUADRUPED` monster.
- `nethack-c/upstream/src/read.c:2913`: normal genocide rejects monsters without `G_GENO`, so this row is eligible.
- `nethack-c/upstream/src/read.c:2936` and `:2966`: normal genocide sets the `all` wording and prints the selected monster through `makeplural()` for the `Wiped out all ...` form.
- `nethack-c/upstream/src/objnam.c:2677`: C's `one_off[]` maps `mumak` to `mumakil`.
- `nethack-c/upstream/src/objnam.c:2912`: `makeplural()` applies `singplur_lookup()` before the generic fallback rules.
- `nethack-c/upstream/src/mondata.c:1017`: the C monster-name parser also accepts plural input `mumakil`.
- `js/monster_data.js:83`: local generated monster metadata includes `mumak` in the genocide catalog source.

## JS Changes

- `js/cmd.js:31025`
  - Extended `pluralizeMonsterName()` so names ending in `mumak` pluralize with the C one-off suffix form `mumakil`.

## Tests

- `test/shop-billing-helpers.test.mjs:13552`
  - Added a normal scroll-of-genocide canary for `mumak`, requiring `Wiped out all mumakil.` and rejecting `mumaks`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "genocide pluralizes homunculus|genocide pluralizes baluchitherium|genocide pluralizes violet fungus|genocide pluralizes mumak|genocide cleanup drops worn life saving amulet from nonliving steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name pluralizer rather than the full C `makeplural()` implementation.
- `erinys -> erinyes` and `djinni -> djinn` remain real C plural cases, but they are not normal-genocidable in C and are not ordinary JS genocide catalog entries.
- Reachable normal-genocide follow-ups include compound and as-is cases such as `lurker above -> lurkers above`, `watchman -> watchmen`, `manes`, `tengu`, `Uruk-hai`, `Olog-hai`, `jellyfish`, and `piranha`.
