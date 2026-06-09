# Kick Ouch Drawbridge Feel

## C anchors

- `nethack-c/upstream/src/dokick.c:881` through `:904` order `kick_ouch()` as: `Ouch!`, Dexterity/Strength exercise, blind `feel_location()` on the original struck square, drawbridge-wall message and coordinate rewrite, `wake_nearto(x, y, 25)`, wound/damage rolls, `losehp()`, then air/levitation hurtle if `losehp()` returns.
- `nethack-c/upstream/src/dokick.c:892` through `:897` print `The drawbridge is unaffected.`, call `find_drawbridge(&x, &y)`, and update `gm.maploc` to the drawbridge square.
- `nethack-c/upstream/src/dbridge.c:180` through `:199` rewrite drawbridge wall coordinates to the bridge square: `DB_NORTH` means `y + 1`, `DB_SOUTH` means `y - 1`, `DB_EAST` means `x - 1`, and `DB_WEST` means `x + 1`.
- `nethack-c/upstream/src/display.c:746` starts `feel_location()`, which marks the original adjacent square before the drawbridge rewrite.
- `nethack-c/upstream/src/dokick.c:792` through `:826` build the kick death cause from `gm.maploc` when no kicked object name is supplied, so fatal no-object drawbridge-wall kicks die from `kicking a drawbridge`.

## JS parity

- `js/cmd.js` now marks the original struck square for blind `kick_ouch()` via `feelKickOuchLocation()`, using the same local map-memory shape as search feeling: set `seenv`, reveal the top floor object, and call `newsym()`.
- `applyKickOuchDamage()` now detects drawbridge walls with the existing `isDrawbridgeWallAt()`/`findDrawbridgeAtOrWall()` helpers, appends `The drawbridge is unaffected.`, records the rewritten bridge coordinate in `game._maploc`, and wakes nearby monsters around the bridge square.
- Fatal no-object drawbridge-wall kicks now use the rewritten bridge coordinate for `kickOuchDeathCause()`, producing `kicking a drawbridge` rather than stale wall/rock wording.
- The new feel/drawbridge work happens before the existing wound and damage RNG path, so successful and fatal RNG logs remain unchanged except for behavior that already follows from maploc coordinate selection.

## Canaries

- `blind command kicked boulder on closed door feels target before object ouch damage` covers blind `feel_location()`-style map memory on an ordinary obstruction kick-ouch path, top-object reveal, unchanged `Ouch!` message, and no extra RNG.
- `blind command kicked object ouch at drawbridge wall feels wall and wakes bridge side` covers blind feel on the original wall square, object reveal, `The drawbridge is unaffected.` ordering after `Ouch!`, bridge-side wake coordinate rewrite with strict distance, and no extra RNG.
- `fatal command kick at drawbridge wall dies from kicking a drawbridge` covers the no-object terrain path, drawbridge maploc rewrite, fatal command mode, no hurtle, and C-shaped death cause.

## Remaining follow-up

- Post-life-saving airlevel/levitation hurtle remains open because the current JS life-saving command mode restores HP on the follow-up input without a per-action continuation hook.
- Successful object-kick airlevel recoil is covered by `877-kick-object-success-air-recoil-2026-06-09.md`.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'drawbridge wall|kicked object ouch|boulder on closed door|levitating .*object ouch|blind command kicked boulder' test/shop-billing-helpers.test.mjs` (`9` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`2980` tests passed)
- `npm run score` (`44/44` frozen sessions passing)
