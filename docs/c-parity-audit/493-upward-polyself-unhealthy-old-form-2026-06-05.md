# C Parity Audit 493: Upward Polyself Unhealthy Old Form

Extended upward falling-object polyself handling to cover the C `rehumanize()` branch where the monster form dies but the restored old form already has less than 1 HP. In C, the object still lands before HP loss, `losehp()` returns after `rehumanize()`, and the resulting killer is the unhealthy old-form reversion rather than the falling object.

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used. The canary uses ordinary test RNG control only.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1284`: upward self-hit text says the object falls back on the hero's head.
- `nethack-c/upstream/src/dothrow.c:1420` through `:1423`: `toss_up()` lands the object with `hitfloor(obj, TRUE)` before calling `losehp(dmg, "falling object", KILLED_BY_AN)`.
- `nethack-c/upstream/src/hack.c:4267` through `:4276`: polymorphed `losehp()` subtracts from `u.mh`, calls `rehumanize()` when `u.mh < 1`, and returns before installing the falling-object killer.
- `nethack-c/upstream/src/polyself.c:1393` through `:1403`: ordinary `rehumanize()` prints `You return to <race> form!`, then if `u.uhp < 1` prints `Your old form was not healthy enough to survive.` and dies as `reverting to unhealthy <race> form`.
- `nethack-c/upstream/src/polyself.c:1371` through `:1378`: the `Unchanging` depleted-form branch remains separate and still dies as `killed while stuck in creature form`.

## JS Changes

- `js/cmd.js`
  - Changed `rehumanizeAfterPolyselfDeath()` to return structured `{ messages, died }` status.
  - Stopped clamping restored base HP to at least 1, so an unhealthy old form can remain at 0 HP.
  - Added the C unhealthy-old-form message and death cause: `killed by reverting to unhealthy <race> form`.
  - Propagated fatal/more status through upward falling-object damage and blessed-water lycanthropy reversion without adding the base-form `You die...` text.
  - Preserved royal-jelly rehumanization behavior while suppressing the generic `You die...` suffix for this specific `rehumanize()` death branch.

## Tests

- `upward hero-thrown tin opener polyself old form too weak to survive`
  - Uses C-style `mh/mhmax` active form HP and a base old form with `uhp: 0`.
  - Verifies object self-hit text, floor landing, rehumanization, unhealthy-old-form message, and no falling-object killer.
  - Verifies fatal `deathDieMore` state, restored base stats, cleared polyself state, and the projectile RNG prefix.

Existing audit 492 canaries continue to cover ordinary rehumanization and `Unchanging` stuck-in-creature-form death.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown tin opener .*polyself|old form too weak|unchanging polyself" test/shop-billing-helpers.test.mjs` - pass, 3 matching tests
- `node --test --test-name-pattern "upward hero-thrown" test/shop-billing-helpers.test.mjs` - pass, 116 matching tests
- `node --test --test-name-pattern "cursed royal jelly rehumanizes|blessed water vapor reverts matching were-beast|upward hero-thrown tin opener .*polyself|old form too weak|unchanging polyself" test/shop-billing-helpers.test.mjs` - pass, 5 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1800 tests
- `node --test` - pass, 1951 tests
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass

## Remaining

- Broader `rehumanize()` fallout such as equipment retouching, bare-handed petrification checks, shifted-vampire form routing, and life-saving from this death branch remains outside this narrow upward falling-object slice.
