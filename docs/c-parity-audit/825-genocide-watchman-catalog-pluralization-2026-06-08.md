# C Parity Audit 825: Genocide Watchman Catalog and Pluralization

Closed a normal genocide gap for C's watch monsters. C marks both `watchman` and `watch captain` as `G_GENO` despite `G_NOGEN`, so normal genocide accepts them. C also pluralizes `watchman` through its `man -> men` rule and accepts `watchmen` as an explicit parser alias. JS previously had watchmen in special level-generation data, but normal genocide did not catalog them and would reject `watchman`, `watchmen`, and `watch captain` as nonexistent.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries read ordinary scrolls of genocide in synthetic non-shop floor state and target source-backed monster names directly.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:2816` through `:2824`: `watchman` has `(G_SGROUP | G_NOGEN | G_GENO | 1)`, so it is normal-genocide eligible.
- `nethack-c/upstream/include/monsters.h:2825` through `:2832`: `watch captain` also has `(G_NOGEN | G_GENO | 1)`.
- `nethack-c/upstream/src/read.c:2890` through `:2894`: normal genocide resolves player input through `name_to_mon()` and rejects unknown names.
- `nethack-c/upstream/src/read.c:2913` through `:2927`: C rejects only monsters without `G_GENO`, not `G_NOGEN` monsters.
- `nethack-c/upstream/src/read.c:2936` through `:2966`: normal genocide sets `which = "all "` and prints the selected monster through the all-form message.
- `nethack-c/upstream/src/objnam.c:2921` through `:2927`: `makeplural()` maps terminal `man` to `men` when `badman()` does not exclude the name.
- `nethack-c/upstream/src/objnam.c:3194` through `:3205`: `badman()` excludes names like `human` and `shaman`; `watchman` is not excluded.
- `nethack-c/upstream/src/mondata.c:1015`: C explicitly maps the plural input `watchmen` back to `PM_WATCHMAN`.
- `js/mklev.js:863` through `:864`: JS already has special monster metadata for `WATCHMAN` and `WATCH_CAPTAIN`, but those objects are not exposed through the normal random monster catalog.
- `js/cmd.js:31055` through `:31071`: JS normal genocide catalogs random/common monsters, `RANDOM_MONSTER_BY_NAME`, and the supplemental watch rows added here.

## JS Changes

- `js/cmd.js:31001`
  - Added a compact supplemental normal-genocide catalog for the C-backed `watchman` and `watch captain` rows.
- `js/cmd.js:31047`
  - Added a narrow `watchman -> watchmen` plural rule before default suffix pluralization.
- `js/cmd.js:31071`
  - Included the supplemental watch monster rows in `genocideMonsterCatalog()`.

## Tests

- `test/shop-billing-helpers.test.mjs:13605`
  - Added a normal scroll-of-genocide canary requiring `Wiped out all watchmen.` for singular `watchman` input.
- `test/shop-billing-helpers.test.mjs:13619`
  - Added a plural alias canary requiring C-style `watchmen` input to resolve to `watchman`.
- `test/shop-billing-helpers.test.mjs:13632`
  - Added a `watch captain` canary proving the adjacent C `G_GENO | G_NOGEN` row is cataloged for normal genocide.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide pluralizes homunculus|genocide pluralizes baluchitherium|genocide pluralizes violet fungus|genocide pluralizes mumak|genocide pluralizes lurker above|genocide keeps C as-is plural monster names|genocide pluralizes watchman|genocide accepts C watchmen plural alias|genocide catalogs C watch captain|genocide cleanup drops worn life saving amulet from nonliving steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name pluralizer rather than the full C `makeplural()` implementation.
- JS still has broader normal-genocide eligibility/catalog drift, including previously noted `ki-rin` over-inclusion and special C `G_GENO | G_NOGEN` catalog misses such as `queen bee`, `woodchuck`, water creatures, `giant`, `minotaur`, and `water troll`.
