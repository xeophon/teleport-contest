# 893 - Chest fire life-saving continues into tail effects

## C source

- `nethack-c/upstream/src/trap.c:6438` routes chest and box fire traps through `dofiretrap(obj)`.
- `nethack-c/upstream/src/trap.c:4238` rolls the original fire damage before pool checks.
- `nethack-c/upstream/src/trap.c:4253` through `:4303` handles the non-pool tower-of-flame damage and calls `losehp(num, tower_of_flame, KILLED_BY_AN)`.
- `nethack-c/upstream/src/trap.c:4304` through `:4309` continues after `losehp()` into `burn_away_slime()`, armor fire, inventory destruction, and ignited items.
- `nethack-c/upstream/src/trap.c:4251` keeps the boiling-water pool branch as an early return.

## Port

- `js/cmd.js` now preserves immediate no-amulet fatal behavior for direct tower damage.
- If direct tower damage consumes life saving, the helper restores HP for same-function continuation, then still burns away slime and applies carried inventory fire.
- If the tail effects survive, the original life-saving More state is returned and `_life_saving_post_continue_hp` records the post-tail HP for the More dismissal.
- If a later tail effect causes final death, that later fatal result is allowed to route to death More instead of being masked by the earlier life-saving result.

## Tests

- Added `#untrap known-box direct fire life saving continues into slime and inventory fire`.
- Existing adjacent canaries still cover nonfatal scroll burning, fatal no-amulet fire, pool steam, fire resistance, and command confirmation flow.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot --test-name-pattern "known-box .*fire" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`

## Remaining nearby gaps

- Inventory fire fatal-after-direct-life-saving remains covered by helper routing rather than a command-path canary; the direct regression focuses on the C ordering of direct damage, amulet save, slime burnoff, and carried scroll destruction.
