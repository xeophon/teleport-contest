# C Parity Audit 513: Fire Explosion Inventory Water Vapor Lifesaving

Implemented fire-explosion hero hits now preserve inventory-fire blessed-water vapor rehumanization death metadata. Burning oil explosions, scroll tower-of-flame explosions, and pyrolisk egg fireballs opt `fireDamageInventory()` into life-saving vapor and propagate `lifeSaving`/`fatal` metadata through the displayed command result instead of flattening the returned inventory-fire messages into ordinary HP damage.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries use synthetic non-shop floor state, carried blessed water, a worn amulet of life saving, and an unhealthy werewolf old form.

## Source Anchors

- `nethack-c/upstream/src/explode.c:606`: fire explosions burn away hero slime before property damage.
- `nethack-c/upstream/src/explode.c:613`: fire explosions burn hero armor and ignite carried items.
- `nethack-c/upstream/src/explode.c:615`: explosion hero hits call `destroy_items(&gy.youmonst, adtyp, dam)`.
- `nethack-c/upstream/src/zap.c:5903`: fire-destroyed carried items print boil/explode wording before vapor effects.
- `nethack-c/upstream/src/zap.c:5913`: fire-destroyed carried potions call `potionbreathe(obj)`.
- `nethack-c/upstream/src/zap.c:5931`: destroyed carried items are used up after vapor handling returns.
- `nethack-c/upstream/src/potion.c:2080`: blessed and cursed water vapor handles lycanthropy.
- `nethack-c/upstream/src/potion.c:2086`: matching blessed water vapor calls `you_unwere(FALSE)`.
- `nethack-c/upstream/src/polyself.c:1397`: unhealthy old-form rehumanization calls `done(DIED)`.
- `nethack-c/upstream/src/end.c:1081` and `:1119`: life saving consumes the amulet, reports the medallion, and returns to the original caller.
- `nethack-c/upstream/src/explode.c:662`: ordinary fatal fire explosion damage still has explosion-specific killer wording after inventory damage.

## JS Changes

- `js/cmd.js`
  - Adds a shared fire-explosion inventory-damage helper that calls `fireDamageInventory(..., { allowLifeSaving: true })`.
  - Stops ordinary explosion HP damage from overwriting a vapor-produced life-saving or fatal outcome.
  - Propagates resolver `lifeSaving`/`fatal` metadata through nested pyrolisk egg message arrays.
  - Applies the shared `lifeSavingMore`/`deathDieMore` command handoff after fire-scroll, pyrolisk egg eating, upward pyrolisk egg, direct pyrolisk egg, and wielded pyrolisk egg paths.
  - Exposes narrow resolver test hooks for scroll tower-of-flame and pyrolisk fireball explosions.

## Tests

- `fire scroll tower explosion inventory vapor uses lifesaving for old-form death`
  - Asserts tower-of-flame text, potion boil/explode, rehumanization, medallion text, `lifeSavingMore`, amulet and potion consumption, and life-saving continuation.
- `pyrolisk egg fireball inventory vapor uses lifesaving for old-form death`
  - Asserts fireball text, potion boil/explode, rehumanization, medallion text, `lifeSavingMore`, amulet and potion consumption, and lycanthropy retention.

## Follow-Ups

- Pyrolisk fiery gaze is source-backed in C but not yet modeled as a distinct live JS monster gaze path.
- Natural monster `AT_EXPL/AD_FIRE` fiery explosions, such as a future flaming-sphere path, need a separate production monster-turn slice.
- Monster fire pillar inventory-vapor ordering remains separate from explosion ordering.
- C can continue after life saving and apply later explosion HP damage; JS still uses delayed `lifeSavingMore` continuation and leaves full post-life-saving tail damage as a broader follow-up shared with audits 510-512.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "fire scroll tower explosion inventory vapor|pyrolisk egg fireball inventory vapor" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
