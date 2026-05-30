# C Parity Audit 231: Polyself Helm Sense Refresh

## Sources

- `nethack-c/upstream/include/objects.h:479-485`: helm of caution grants `WARNING`; helm of telepathy grants `TELEPAT`.
- `nethack-c/upstream/src/do_wear.c:542-548`: `Helmet_off()` special-cases helm of telepathy and helm of caution by clearing `W_ARMH`, then calling `see_monsters()`.
- `nethack-c/upstream/src/polyself.c:1239-1244`: horned-form headgear fallout calls `Helmet_off()` before dropping the item.
- `nethack-c/upstream/src/polyself.c:1264-1270`: no-hands or very small headgear fallout follows the same `Helmet_off()` then drop sequence.
- `nethack-c/upstream/src/display.c:1487-1513`: `see_monsters()` redraws every live monster square with `newsym()`.

## JS Changes

- Added display-side worn-source detection for helm of caution so warning glyph rendering can come from equipment, not only `game.u.warning`.
- Added exported `seeMonsters()` in `js/display.js` as the local analogue of C `see_monsters()`.
- After forced polyself drops a helm of telepathy or helm of caution, `js/cmd.js` now calls `seeMonsters()` after the item has actually left worn inventory state.
- Kept the behavior scoped to forced helmet removal; this does not add broader wear/takeoff plumbing.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Blind hero wearing a helm of telepathy sees a remote monster glyph; no-hands polyself drops the helm and the remote cell redraws blank.
- Hero with no intrinsic warning wears a helm of caution and sees a warning glyph; no-hands polyself drops the helm and the remote cell redraws blank.

## Remaining Gaps

- Periodic warning redraw outside `newsym()` still has direct `game.u.warning` gates in some paths.
- Broader normal wear/takeoff paths still need the same sense-refresh behavior.
- Water-walking and levitation boot terrain side effects from `Boots_off()` remain separate polyself fallout gaps.
- Forced polyself weapon release/drop parity for cursed wielded items remains open.

## Verification

- `node --check js/display.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "telepathy refreshes|caution refreshes|helm of brilliance|helm of opposite alignment|uses hero surface|drops shield helm and boots" test/shop-billing-helpers.test.mjs` (`7` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1121/1121` tests passed)
- `node --test test/*.mjs` (`1218/1218` tests passed)
- `npm run score` (`44/44` passing)
