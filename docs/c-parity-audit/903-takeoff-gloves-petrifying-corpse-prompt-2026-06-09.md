# Takeoff Gloves Petrifying Corpse Prompt

Date: 2026-06-09

## C anchors

- `nethack-c/upstream/src/do_wear.c:1948` assigns `Gloves_off` as the delayed callback for glove doffing.
- `nethack-c/upstream/src/do_wear.c:1969` prints `You finish taking off your <gloves>.` before the glove removal callback runs.
- `nethack-c/upstream/src/do_wear.c:2990` `better_not_take_that_off()` checks glove removal for carried stoning corpses.
- `nethack-c/upstream/src/do_wear.c:2998` calls `u_safe_from_fatal_corpse()` with `st_corpse | st_petrifies`, deliberately not `st_resists`, so stone resistance does not suppress the warning prompt.
- `nethack-c/upstream/src/do_wear.c:3001` prompts `Take off your <gloves> despite carrying a dead <monster>?`.
- `nethack-c/upstream/src/do_wear.c:600` `wielding_corpse()` petrifies only when a petrifying corpse is actively wielded in the primary hand or active two-weapon secondary hand after gloves are removed.

## JS changes

- Added a glove-removal corpse warning prompt that requires full `yes`; `n`, `q`, escape, blank enter, space, or partial text decline with no move.
- Routed ordinary `T`/`R` glove removal and queued `A` removal through the prompt without treating promptable gloves as a silent preflight blocker.
- Preserved C blocker ordering: welded weapon and slippery hands/gloves still block before the petrifying-corpse prompt.
- Added delayed armor-finish fallout so confirmed leather-glove removal applies the cockatrice/chickatrice bare-hand stoning check when the gloves actually come off.
- Shared the glove-removal stoning fallout with `allmain` occupation completion paths and the queued finish-message path.
- Kept the fatal check to active primary or active two-weapon alternate corpses, not every carried petrifying corpse.

## Tests

- `takeoff command prompts before removing gloves while carrying cockatrice corpse`
- `takeoff command requires full yes for petrifying corpse glove prompt`
- `takeoffall command prompts before queued gloves removal with cockatrice corpse`
- `takeoff command confirmed gloves removal can petrify wielded cockatrice corpse`

## Verification

- `node --check js/cmd.js`
- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "petrifying corpse glove prompt|cockatrice corpse|requires full yes|confirmed gloves removal|takeoffall command prompts" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `git diff --check`
- `npm run score` (`44/44 passing`)

## Remaining gaps

- `TT_LAVA` boot removal remains intentionally unblocked here because the C `select_off()` boot removal branch only checks `TT_INFLOOR`; lava-specific boot effects need a separate audit.
