# C Parity Audit 826: Genocide Special Catalog Monsters

Closed another normal genocide catalog gap for C `G_GENO` monsters that JS can already model through special lookups or mkclass extra rows. C accepts these names through normal genocide even when their generation flags include `G_NOGEN`; JS could resolve the monster data with `monsterByRndName()`, but `genocideMonsterCatalog()` did not enumerate those lookup-only rows, so direct normal genocide rejected them as nonexistent.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary reads ordinary scrolls of genocide in synthetic non-shop floor state and targets source-backed monster names directly.

## Source Anchors

- `nethack-c/upstream/src/read.c:2890` through `:2894`: normal genocide resolves player input through `name_to_mon()` and rejects unknown names.
- `nethack-c/upstream/src/read.c:2913` through `:2927`: C rejects only monsters without `G_GENO`, so `G_NOGEN` does not block normal genocide.
- `nethack-c/upstream/src/read.c:2936` through `:2966`: normal genocide prints the selected monster through the all-form `Wiped out all ...` message.
- `nethack-c/upstream/include/monsters.h:126` through `:133`: `queen bee` has `G_GENO | G_NOGEN`.
- `nethack-c/upstream/include/monsters.h:927` through `:934`: `woodchuck` has `G_NOGEN | G_GENO`.
- `nethack-c/upstream/include/monsters.h:1714` through `:1721`: `giant` has `G_GENO | G_NOGEN | 1`.
- `nethack-c/upstream/include/monsters.h:1786` through `:1792`: `minotaur` has `G_GENO | G_NOGEN`.
- `nethack-c/upstream/include/monsters.h:2250` through `:2255`: `water troll` has `G_NOGEN | G_GENO`.
- `nethack-c/upstream/include/monsters.h:3205` through `:3256`: `jellyfish`, `piranha`, `shark`, `giant eel`, `electric eel`, and `kraken` all have `G_GENO | G_NOGEN` or `G_GENO | G_NOGEN | G_SGROUP`.
- `js/mklev.js:5958` through `:5966`: JS `specialMonsterByName()` can resolve `queen bee`, `woodchuck`, `jellyfish`, `piranha`, `shark`, `giant eel`, `electric eel`, and `kraken`.
- `js/mklev.js:5851` through `:5864`: JS `MKCLASS_EXTRA_ROWS` contains `giant`, `minotaur`, and `water troll`, and `monsterByRndName()` checks those rows at `js/mklev.js:5981` through `:5984`.
- `js/cmd.js:31059` through `:31076`: JS normal genocide enumerates common/random rows, manual supplemental watch rows, and the lookup-only special names added here.

## JS Changes

- `js/cmd.js:31005`
  - Added a supplemental name list for the C-backed lookup-only monsters: `queen bee`, `woodchuck`, `jellyfish`, `piranha`, `shark`, `giant eel`, `electric eel`, `kraken`, `giant`, `minotaur`, and `water troll`.
- `js/cmd.js:31076`
  - `genocideMonsterCatalog()` now adds each supplemental name through `monsterByRndName()` so existing JS metadata remains the single source for those monster objects.

## Tests

- `test/shop-billing-helpers.test.mjs:13650`
  - Added a table canary that reads normal scrolls of genocide for all newly cataloged special names, asserts the expected `Wiped out all ...` output, exits the prompt, and records the target in `_genocided_monsters`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide pluralizes watchman|genocide accepts C watchmen plural alias|genocide catalogs C watch captain|genocide catalogs special C normal-genocide monsters|genocide keeps C as-is plural monster names|genocide cleanup drops worn life saving amulet from nonliving steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still carries a compact monster-name pluralizer rather than the full C `makeplural()` implementation.
- JS still has broader normal-genocide eligibility drift, including previously noted `ki-rin` over-inclusion.
