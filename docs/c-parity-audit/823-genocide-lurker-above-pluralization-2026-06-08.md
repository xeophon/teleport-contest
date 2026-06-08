# C Parity Audit 823: Genocide Lurker Above Pluralization

Closed another normal genocide monster-name pluralization gap. C's `makeplural()` treats ` above` as a compound marker, pluralizes the head noun, and reattaches the suffix, so `lurker above` becomes `lurkers above`. JS previously fell through to the default `+s` path and could report `lurker aboves`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads an ordinary scroll of genocide in synthetic non-shop floor state and targets the catalog monster name directly.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:981` through `:982`: `lurker above` is a genocidable `S_TRAPPER` monster.
- `nethack-c/upstream/src/read.c:2936` through `:2966`: normal genocide sets `which = "all "` and prints the selected monster through `makeplural()` for the `Wiped out all ...` form.
- `nethack-c/upstream/src/objnam.c:2789`: C's compound table includes `" above"` for `lurkers above`.
- `nethack-c/upstream/src/objnam.c:2883`: `makeplural()` splits recognized compounds before applying plural rules to the head noun.
- `nethack-c/upstream/src/mondata.c:1012`: the C monster-name parser also accepts plural input `lurkers above`.
- `js/monster_data.js:97`: local generated monster metadata includes `lurker above` in the genocide catalog source.

## JS Changes

- `js/cmd.js:31025`
  - Extended `pluralizeMonsterName()` so names ending in ` above` pluralize the head noun through the same helper and preserve the compound suffix.

## Tests

- `test/shop-billing-helpers.test.mjs:13566`
  - Added a normal scroll-of-genocide canary for `lurker above`, requiring `Wiped out all lurkers above.` and rejecting `lurker aboves`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide pluralizes homunculus|genocide pluralizes baluchitherium|genocide pluralizes violet fungus|genocide pluralizes mumak|genocide pluralizes lurker above|genocide cleanup drops worn life saving amulet from nonliving steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name pluralizer rather than the full C `makeplural()` implementation.
- Reachable normal-genocide follow-ups include `watchman -> watchmen` and as-is plural cases such as `manes`, `tengu`, `Uruk-hai`, `Olog-hai`, `jellyfish`, and `piranha`.
