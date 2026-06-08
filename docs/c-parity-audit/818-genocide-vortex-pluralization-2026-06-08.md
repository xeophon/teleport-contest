# C Parity Audit 818: Genocide Vortex Pluralization

Closed the genocide message pluralization gap for vortex-family monster names. C routes genocide monster names through `makeplural()`, whose `rtex -> rtices` special suffix turns `vortex` into `vortices`; JS previously used the generic `x -> xes` fallback, so `steam vortex` was reported as `steam vortexes`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary uses the existing synthetic steam-vortex genocide cleanup fixture.

## Source Anchors

- `nethack-c/upstream/src/read.c:2728` through `:2751`: class genocide precomputes `nam` with `makeplural(mons[i].pmnames[NEUTRAL])` and prints `Wiped out all %s.`.
- `nethack-c/upstream/src/read.c:2955` through `:2966`: normal genocide logs and prints the selected monster type with `makeplural()` when the message is the "all" form.
- `nethack-c/upstream/include/monsters.h:1091` through `:1092`: `steam vortex` is a genocidable `S_VORTEX` monster.
- `nethack-c/upstream/src/objnam.c:2682`: `one_off[]` maps the `rtex` suffix to `rtices` for `vortex`.
- `nethack-c/upstream/src/objnam.c:2764` through `:2775`: `singplur_lookup()` applies `one_off[]` suffix transformations.
- `nethack-c/upstream/src/objnam.c:2911` through `:2913`: `makeplural()` calls `singplur_lookup(..., TRUE, ...)` before the generic suffix fallbacks.
- `nethack-c/upstream/src/objnam.c:2825` through `:2836`: `makeplural()` is explicitly documented as used for plural monster names such as `Wiped out all homunculi.`.

## JS Changes

- `js/cmd.js:31025`
  - Extended `pluralizeMonsterName()` with a source-backed `rtex -> rtices` suffix rule before the generic `x -> xes` branch.

## Tests

- `test/shop-billing-helpers.test.mjs:13901`
  - Tightened the steam-vortex genocide cleanup canary to require `Wiped out all steam vortices.` and reject the old `vortexes` text while preserving the life-saving absence checks from the prior slice.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "genocide cleanup drops worn life saving amulet from nonliving steam vortex|genocide cleanup creates harmless gas cloud for removed steam vortex" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- JS still implements only a compact subset of C `makeplural()` for monster names. This slice closes the C-backed vortex/vortices path used by current genocide cleanup canaries without attempting a broad object-name pluralization port.
