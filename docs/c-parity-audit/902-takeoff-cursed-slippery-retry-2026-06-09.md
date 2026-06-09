# Takeoff `cursed()` Slippery Retry

Date: 2026-06-09

## C anchors

- `nethack-c/upstream/src/do_wear.c:1893` `cursed()` checks known curse state before setting `bknown`.
- `nethack-c/upstream/src/do_wear.c:1904` known cursed/welded rings and primary weapons with `Glib` report `Despite your slippery fingers, you can't.` or `Despite your slippery gloves, you can't.`.
- `nethack-c/upstream/src/do_wear.c:1911` unknown or non-slippery curse refusals keep the generic `You can't.  It is cursed.` / `They are cursed.` wording.
- `nethack-c/upstream/src/do_wear.c:2696` `select_off()` filters blocked `A` selections before they enter `context.takeoff.mask`.
- `nethack-c/upstream/src/do_wear.c:2900` `take_off()` clears the current queued bit after a blocked removal and continues with later queued work instead of retrying the same item forever.

## JS changes

- Added shared cursed takeoff refusal helpers that preserve the C known-vs-unknown split.
- Updated `R`/`T` worn-equipment removal to use the slippery retry text for known cursed bare-finger rings while retaining the first-attempt generic curse discovery wording.
- Updated `A` primary-weapon unwielding to route welded/cursed primary weapons through takeoff `cursed()` wording instead of the ready-command welded message.
- Added `A` selection preflight so known select-off blockers and cursed selected items are not left in `_takeoff_all_queue`.
- Added blocked-result continuation handling so any zero-move blocked queue entry is dropped before later queued items are considered.
- Extended ring blocker recognition to worn meat rings for the same takeoff path.

## Tests

- `remove command uses slippery retry wording for known cursed bare-finger ring`
- `remove command first learns unknown cursed slippery ring with generic wording`
- `takeoffall selected known welded primary uses slippery fingers retry wording`
- `takeoffall selected known welded primary uses slippery gloves retry wording`
- `takeoffall filters blocked selections out of the continuation queue`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "slippery retry wording|unknown cursed slippery ring|welded primary uses slippery|filters blocked selections" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `git diff --check`
- `npm run score` (`44/44 passing`)

## Remaining gaps

- The petrifying-corpse glove-removal prompt from `better_not_take_that_off()` remains unmodeled.
- `TT_LAVA` boot removal remains intentionally unblocked here because the C `select_off()` boot removal branch only checks `TT_INFLOOR`; lava-specific boot effects need a separate audit.
