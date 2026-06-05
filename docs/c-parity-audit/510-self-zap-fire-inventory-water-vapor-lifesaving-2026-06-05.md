# C Parity Audit 510: Self-Zap Fire Inventory Water Vapor Lifesaving

Self-zapped wand-of-fire inventory destruction now preserves blessed-water vapor rehumanization death metadata through the queued command messages. The self-zap fire branch opts inventory fire into life-saving vapor, skips generic self-zap HP/death overwrite when vapor already produced fatal metadata, and tags the final queued vapor message so the existing `lifeSavingMore` or `deathDieMore` command modes take over after the vapor text is displayed.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary drives the live `z`, wand selection, and `.` self-zap command path with ordinary inventory objects.

## Source Anchors

- `nethack-c/upstream/src/zap.c:2705`: `zapyourself()` handles self-zapped wands and horns.
- `nethack-c/upstream/src/zap.c:2752`: `WAN_FIRE` and `FIRE_HORN` roll `orig_dmg = d(12,6)`.
- `nethack-c/upstream/src/zap.c:2756`: fire resistance changes only ordinary HP damage and monster observation, not inventory fire processing.
- `nethack-c/upstream/src/zap.c:2766`: fire self-zap burns away slime, then burns armor.
- `nethack-c/upstream/src/zap.c:2768`: fire self-zap calls `destroy_items(&gy.youmonst, AD_FIRE, orig_dmg)`.
- `nethack-c/upstream/src/zap.c:2769`: fire self-zap calls `ignite_items(gi.invent)` after item destruction.
- `nethack-c/upstream/src/zap.c:5913`: carried non-cold destroyed potions call `potionbreathe(obj)` before use-up.
- `nethack-c/upstream/src/potion.c:2080`: blessed water vapor can call `you_unwere(FALSE)` for a matching lycanthrope beast form.
- `nethack-c/upstream/src/polyself.c:1395`: unhealthy old-form rehumanization sets the old-form death state and calls `done(DIED)`.
- `nethack-c/upstream/src/end.c:1081`: life saving consumes the amulet and returns from `done()` so the original fire caller can continue.

## JS Changes

- `js/cmd.js`
  - Adds `applyLifeSavingOrFatalCommandMode()` as a shared metadata handoff helper.
  - Updates the self-zap fire wand/fire horn branch to call `fireDamageInventory(..., { allowLifeSaving: true })`.
  - Preserves `lifeSaving` and `fatal` metadata on queued self-zap follow-up messages instead of flattening everything to strings.
  - Teaches the queued-message processor to enter `lifeSavingMore` or `deathDieMore` when a queued entry carries that metadata.

## Tests

- `self-zapped wand of fire inventory vapor rehumanize old form death uses lifesaving`
  - Uses the live zap command sequence with a wand of fire, carried blessed water, matching werewolf polyself, unhealthy old form, and a worn amulet of life saving.
  - Asserts self-zap fire text, potion boil/explode text, rehumanization, medallion text, command-mode handoff to `lifeSavingMore`, potion and amulet consumption, lycanthropy retention, wand identification, and the life-saving continuation.

## Follow-Ups

- Monster fire-breath hero-hit inventory fire still needs separate queued-event metadata propagation. Directional fire ray hero-hit inventory fire is covered in audit 511.
- Explosion callers such as burning oil, scroll tower-of-flame, and pyrolisk fireball still flatten inventory-fire vapor metadata.
- Fatal unsaved vapor in the helper still consumes the destroyed potion in JS because `fireDamageInventory()` does not currently model C's non-returning `done()` interruption inside `potionbreathe()`.
- C continues the original fire caller after life saving; JS still uses delayed `lifeSavingMore` continuation and does not yet model every post-life-saving tail damage case.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "self-zapped wand of fire inventory vapor|fire trap command inventory fire|destroyed inventory potion" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
