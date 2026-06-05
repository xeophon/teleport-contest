# C Parity Audit 503: Upward Rehumanize Self-Touch Fatal State

Upward thrown objects that fall back onto the hero now carry `rehumanize()` death metadata through the non-food falling-damage command path. If falling-object damage exhausts polyself HP, the object lands before `rehumanize()` runs. If the restored form loses petrification resistance while wielding a cockatrice corpse and wearing no gloves, the command enters the stoning death-more state with the self-touch messages and no generic falling-object death text.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries use existing upward throw command handlers and live inventory state.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1588`: upward throws route into `toss_up()` when `u.dz < 0`.
- `nethack-c/upstream/src/dothrow.c:1284`, `:1420`, and `:1423`: the self-hit message is printed, the object is dropped through `hitfloor(obj, TRUE)`, and only then falling-object HP loss is applied.
- `nethack-c/upstream/src/hack.c:4267`: polymorphed `losehp()` subtracts active monster HP and calls `rehumanize()` when `u.mh < 1`.
- `nethack-c/upstream/src/hack.c:4279`: the generic urgent `You die...` line is only in the non-polymorphed `u.uhp < 1` branch.
- `nethack-c/upstream/src/polyself.c:1395` and `:1415`: `rehumanize()` prints the return-to-human-form message, retouches equipment, and can call `selftouch("No longer petrify-resistant, you")`.
- `nethack-c/upstream/src/trap.c:3888` through `:3894`: `selftouch()` detects a wielded petrifying corpse, prints the touch line, calls immediate stoning, and can return through lifesaving.
- `nethack-c/upstream/src/trap.c:3844`: `instapetrify()` prints `You turn to stone...` and calls `done(STONING)`.
- `nethack-c/upstream/src/topten.c:96`: stoning killer text is formatted with the `petrified by` prefix.

## JS Changes

- `js/cmd.js`
  - Updates `applyHeroThrownCorpseFallingDamage()` so `rehumanizeAfterPolyselfDeath()` deaths can consume lifesaving, set `messages.lifeSaving`, or set `messages.fatal` while preserving the no-generic-`You die...` non-lifesaving stoning path.
  - Adds `messages.lifeSaving` handling to ordinary corpse and generic damaging upward throw dispatchers.
  - Fixes the crackable-armor upward dispatcher to pass through `messages.more` and honor both `messages.lifeSaving` and `messages.fatal` instead of always clearing command mode.

## Tests

- `upward hero-thrown tin opener rehumanizes then selftouches wielded cockatrice corpse`
  - Confirms floor landing before return-to-human-form, then self-touch stoning.
  - Asserts `deathDieMore`, zero move cost, statue bones body, `petrified by a cockatrice corpse`, cleared polyself state, retained wielded corpse, and no `You die...` or falling-object killer text.
- `upward hero-thrown crystal plate mail fatal polyself old form death uses more`
  - Exercises the crackable-armor dispatcher path that previously dropped `messages.fatal`.
  - Confirms landing before unhealthy-old-form death, `deathDieMore`, zero move cost, and no generic falling-object killer text.

## Scope Notes

- This slice models fatal and lifesaving metadata propagation for the upward falling-damage paths that already use `applyHeroThrownCorpseFallingDamage()`. C also unwields the unsafe corpse after lifesaving returns from `selftouch()`; that follow-up inventory mutation remains a separate stoning-lifesaving cleanup slice.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "rehumanizes then selftouches|crystal plate mail fatal polyself old form" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "upward hero-thrown tin opener|upward hero-thrown heavy container|upward hero-thrown crystal plate mail|upward hero-thrown cursed bag of holding fatal|upward hero-thrown ordinary corpse lands before fatal|upward hero-thrown ordinary corpse reports hard helmet" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
