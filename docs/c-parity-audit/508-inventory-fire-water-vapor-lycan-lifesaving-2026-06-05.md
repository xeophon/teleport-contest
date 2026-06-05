# C Parity Audit 508: Inventory Fire Water Vapor Lycanthropy Lifesaving

Inventory fire destruction of blessed water potions now preserves vapor rehumanization death state inside the shared damage helper. C boils and explodes the carried potion, calls `potionbreathe(obj)` while the object still exists, and only then uses up the potion and applies boiling-potion HP damage. When blessed water vapor rehumanizes a matching were-beast with an unhealthy old form, JS now keeps the life-saving/fatal metadata instead of flattening the vapor messages into plain text.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The focused canary calls the test-exposed inventory fire helper with a blessed water potion and a worn amulet of life saving so the helper-level metadata can be verified without pretending that fire trap, ray, or delayed-message command paths already preserve it.

## Source Anchors

- `nethack-c/upstream/src/zap.c:2752`: fire self-zaps and fire horns call `destroy_items(&gy.youmonst, AD_FIRE, orig_dmg)`.
- `nethack-c/upstream/src/zap.c:4421`: fire rays that hit the hero can call `destroy_items(..., AD_FIRE, ...)` after body armor fire handling and the C one-in-three destruction gate.
- `nethack-c/upstream/src/trap.c:4306`, `nethack-c/upstream/src/trap.c:6983`, and `nethack-c/upstream/src/mcastu.c:544`: fire traps, lava effects, and spell pillars are other fire-destruction callers.
- `nethack-c/upstream/src/zap.c:5778`: boiling potions use the `boiling potion` killer string for subsequent HP damage.
- `nethack-c/upstream/src/zap.c:5903`: fire destruction prints that a potion of holy water boils and explodes.
- `nethack-c/upstream/src/zap.c:5913`: potion vapor calls `potionbreathe(obj)` before the destroyed object is consumed.
- `nethack-c/upstream/src/zap.c:5929`: the object is used up after vapor side effects.
- `nethack-c/upstream/src/zap.c:5947`: boiling-potion HP damage is applied after the item-destruction side effects.
- `nethack-c/upstream/src/zap.c:6010` and `nethack-c/upstream/src/zap.c:6063`: delayed destroy-selection paths include water-vapor branches for lycanthrope behavior.
- `nethack-c/upstream/src/potion.c:2080` through `:2088`: blessed water vapor calls `you_unwere(FALSE)` for a matching lycanthrope beast form without curing lycanthropy.
- `nethack-c/upstream/src/were.c:213` through `:225`: non-purifying `you_unwere(FALSE)` can rehumanize only when the nearby-monster gate permits it.
- `nethack-c/upstream/src/polyself.c:1395` through `:1405`: unhealthy old-form rehumanization prints the return message, then death text and killer state.
- `nethack-c/upstream/src/end.c:1081` through `:1094`: life saving prints medallion messages, consumes the amulet, adjusts constitution, and returns through `savelife()`.

## JS Changes

- `js/cmd.js`
  - Adds a small `fireInventoryDamageResult()` return helper so inventory-fire results expose `lifeSaving`, `fatal`, and `more` metadata consistently.
  - Lets `fireDamageInventory()` accept an explicit `allowLifeSaving` option and passes it to direct `potionBreathe()` calls for destroyed potions.
  - Copies `lifeSaving`, `fatal`, and `more` from the potion-vapor message array onto both the helper result and the inventory-destruction event before wrapping the vapor text in `insertAfter` entries.
  - Leaves command-level callers opt-in only. Paths that still spread message arrays, queue delayed message entries, or return strings need their own metadata wiring before they can safely allow amulet consumption.

## Tests

- `blessed water vapor rehumanize old form death from destroyed inventory potion preserves lifesaving metadata`
  - Destroys a carried blessed water potion through `fireDamageInventoryForTest()` while the hero is a matching werewolf with an old form at 0 HP and a worn amulet of life saving.
  - Asserts boil/explode ordering, potion and amulet consumption, return-to-human and medallion messages, `lifeSaving`/`more` metadata on both result and event, lycanthropy retention, and no purification or broken-potion eye/odor text.

## Follow-Ups

- Fire ray and other queued command-level inventory-fire paths still need follow-up patches where their message queues currently flatten array metadata or return string-only helper output. Fire trap movement is covered in audit 509.
- Other direct or broken vapor delivery sites still need their own fatal/life-saving propagation before they can safely opt into amulet consumption.
- The shared non-stoning `lifeSavingMore` continuation currently prints `You feel much better!`; C also prints `The medallion crumbles to dust!`. That broader life-saving wording remains a separate slice.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "destroyed inventory potion|blessed water vapor" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
