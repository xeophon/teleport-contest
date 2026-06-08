# C Parity Audit 815: Genocide Cleanup Steam Vortex Cloud

Closed another `mondead()` side effect from the genocide cleanup removal path. C creates a harmless steam cloud when a steam vortex actually dies through `mondead()`, after monster life-saving/vampire-rise exits and before true-form restoration, died-count bookkeeping, and inventory removal. JS now creates the same active-level harmless gas cloud for genocide cleanup removals whose current apparent form is `steam vortex`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries use synthetic non-shop floor state, ordinary scrolls of genocide, direct steam-vortex fixtures, and shifted apparent steam-vortex fixtures. Tests assert cloud invariants and size range instead of exact RNG coordinates or TTL.

## Source Anchors

- `nethack-c/upstream/src/mon.c:5639`, `:5660`, and `:5667`: `kill_genocided_monsters()` calls `mondead()` for true removals.
- `nethack-c/upstream/src/mon.c:3091` through `:3098`: monster life-saving and vampire-rise handling return before steam-cloud creation.
- `nethack-c/upstream/src/mon.c:3103`: `mondead()` calls `create_gas_cloud(mtmp->mx, mtmp->my, rn2(10) + 5, 0)` when the current `mtmp->data` is `PM_STEAM_VORTEX`.
- `nethack-c/upstream/src/mon.c:3112` through `:3114`: true-form restoration happens after the steam-cloud check.
- `nethack-c/upstream/src/mon.c:3134` through `:3136`: died-count bookkeeping happens after true-form restoration.
- `nethack-c/upstream/src/region.c:1207`: `create_gas_cloud()` treats the size argument as the requested cloud fill count and the damage argument as cloud damage.
- `nethack-c/upstream/src/region.c:1191` through `:1202`: zero-damage gas clouds are harmless steam clouds.

## JS Changes

- `js/cmd.js:31167`
  - Genocide cleanup now creates `createGasCloud(mon.mx, mon.my, rn2(10) + 5, 0)` when the active-level monster being removed currently appears as `steam vortex`.
  - The call stays after failed/absent monster life-saving and before true-form restoration, so shifted apparent steam-vortex deaths create the cloud while still counting the restored true species as vanquished.
  - The side effect is active-level only because `createGasCloud()` writes to `game.level.regions`.

## Tests

- `test/shop-billing-helpers.test.mjs:13664`
  - Added `steamVortexMonster()` for synthetic current-form and shifted apparent-form cleanup canaries.
- `test/shop-billing-helpers.test.mjs:13857`
  - Removing a true steam vortex by genocide cleanup creates exactly one harmless visible gas cloud, includes the death square, uses a generated size in the C `5..14` range, records `steam vortex` as vanquished, and awards no reward XP.
- `test/shop-billing-helpers.test.mjs:13889`
  - Removing a doppelganger while it appears as a steam vortex creates the steam cloud before true-form restoration, then records `doppelganger` rather than `steam vortex`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "genocide cleanup creates harmless gas cloud|genocide cleanup creates steam cloud|genocide cleanup consumes monster life saving before current-form removal|genocide cleanup removes shifted monster" test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "genocide cleanup|life saving|monster life saving|class genocide cleanup|class-genociding shifted vampire|genociding visible shifted vampire|genociding shifted vampire" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Genocide cleanup still does not mirror every `mondead()` side effect: Kop/vault guard and special monster hooks, quest leader and mail daemon bookkeeping, complete light-source cleanup with pre-death data, and livelog/achievement details remain broader follow-ups.
- Exact region messages for the hero being enveloped by harmless steam are not modeled in this cleanup slice.
- Exact C died-count saturation at 255 remains separate from JS `_vanquished_counts`.
- Exhaustive non-genocidable and class-genocide immunity messaging remains separate from this removal-path side-effect work.
