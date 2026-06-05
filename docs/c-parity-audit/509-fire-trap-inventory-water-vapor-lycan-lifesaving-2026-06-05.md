# C Parity Audit 509: Fire Trap Inventory Water Vapor Lycanthropy Lifesaving

Command-level fire trap inventory destruction now preserves blessed-water vapor rehumanization death metadata. The live fire-trap movement branch uses a structured fire-trap result, opts inventory fire into life-saving vapor, and enters `lifeSavingMore` or `deathDieMore` instead of flattening the fire inventory messages into a plain string.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary exercises the structured fire-trap command result used by the movement branch, with a real fire trap object, a carried blessed water potion, and a worn amulet of life saving.

## Source Anchors

- `nethack-c/upstream/src/trap.c:2957`: `FIRE_TRAP` dispatches through `trapeffect_selector()` to `trapeffect_fire_trap()`.
- `nethack-c/upstream/src/trap.c:1735`: the hero branch calls `dofiretrap(NULL)` after marking the trap seen.
- `nethack-c/upstream/src/trap.c:4237`: `dofiretrap()` rolls `orig_dmg = d(2,4)`.
- `nethack-c/upstream/src/trap.c:4300`: the fire trap prints the tower message, applies base fire HP effects, then calls `destroy_items(..., AD_FIRE, orig_dmg)` and `ignite_items(gi.invent)`.
- `nethack-c/upstream/src/trap.c:4310`: floor-object burning and ice melt happen after inventory fire.
- `nethack-c/upstream/src/zap.c:5903`, `:5913`, `:5929`, and `:5935`: selected potions print boil/explode text, call `potionbreathe(obj)` before use-up, then consume the object and apply boiling-potion HP damage.
- `nethack-c/upstream/src/zap.c:6063`: delayed destroy selection covers water-vapor lycanthrope behavior.
- `nethack-c/upstream/src/potion.c:2080`: blessed water vapor calls `you_unwere(FALSE)` for matching lycanthrope beast form without curing lycanthropy.
- `nethack-c/upstream/src/were.c:213`: non-purifying `you_unwere(FALSE)` can call `rehumanize()`.
- `nethack-c/upstream/src/polyself.c:1395`: unhealthy old-form rehumanization prints return text, sets the unhealthy-form killer, and calls `done(DIED)`.
- `nethack-c/upstream/src/end.c:1081` and `:1119`: life saving consumes the amulet, calls `savelife()`, clears killer state, and returns so C can continue the fire-trap tail.

## JS Changes

- `js/cmd.js`
  - Splits `heroFireTrapResult()` from the legacy string wrapper `heroFireTrapMessage()`.
  - Passes `{ allowLifeSaving }` through the fire-trap `fireDamageInventory()` call.
  - Preserves inventory-fire `lifeSaving` and `fatal` metadata in the structured fire-trap result.
  - Keeps generic fire-trap HP/death-cause handling from overwriting vapor old-form death metadata.
  - Updates the live movement fire-trap branch to set `lifeSavingMore` or `deathDieMore` and suppress normal run/time continuation when metadata is present.

## Tests

- `fire trap command inventory fire that destroys blessed water uses lifesaving for old-form death`
  - Builds a fire-trap command result with blessed water, matching werewolf polyself, an unhealthy old form, and a worn amulet of life saving.
  - Asserts tower/flask/rehumanization/medallion messages, result metadata, command-mode handoff to `lifeSavingMore`, amulet and potion consumption, lycanthropy retention, and the life-saving continuation.

## Follow-Ups

- Fire ray, self-zap, and queued fire-breath inventory-fire paths still need separate metadata propagation because they spread message arrays or use delayed event queues.
- Fatal unsaved vapor in the helper still consumes the destroyed potion in JS because `fireDamageInventory()` does not currently model C's non-returning `done()` interruption inside `potionbreathe()`.
- The shared non-stoning `lifeSavingMore` continuation currently prints `You feel much better!`; C also prints `The medallion crumbles to dust!`. That broader life-saving wording remains a separate slice.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "fire trap command inventory fire|destroyed inventory potion" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
