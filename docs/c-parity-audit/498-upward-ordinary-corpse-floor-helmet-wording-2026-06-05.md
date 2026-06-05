# C Parity Audit 498: Upward Ordinary-Corpse Floor And Helmet Wording

Hero-thrown ordinary corpses now follow the C `toss_up()` self-hit message order more closely after surviving the ceiling and self-hit break tests. When the corpse falls onto the hero on hard terrain, it emits the verbose `hitfloor()` line before falling-object HP loss, and worn headgear now uses the C success/failure helmet wording instead of only reporting the hard-helmet success case.

No replay maps, private seeds, player names, move-count branches, or fixture-specific runtime branches are used. The canaries use deterministic test RNG only to assert the live C-shaped call order.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:603` through `:640`: `hitfloor(obj, TRUE)` prints the verbose hard-surface line unless the landing square is soft terrain, water, or engulfing.
- `nethack-c/upstream/src/dothrow.c:1256` through `:1285`: `toss_up()` chooses ceiling/no-ceiling/almost-hit wording and performs the roof `breaktest()` before the object falls back onto the hero.
- `nethack-c/upstream/src/dothrow.c:1291` through `:1298`: surviving non-potions run the self-hit `breaktest()`.
- `nethack-c/upstream/src/dothrow.c:1356` through `:1380`: non-weapon falling-object damage uses weight buckets, hard-helmet capping, damage-increase bonuses, and half-physical reduction.
- `nethack-c/upstream/src/dothrow.c:1382` through `:1397`: worn headgear reports hard-helmet success only when the capped damage is less than current active HP; otherwise non-petrifying objects report `Your helm/hat does not protect you.`
- `nethack-c/upstream/src/dothrow.c:1420` through `:1423`: `hitfloor(obj, TRUE)` happens before `losehp(dmg, "falling object", KILLED_BY_AN)`.

## JS Changes

- `js/cmd.js`
  - Routes ordinary corpse self-hit helmet wording through the shared `pushHeroThrownHelmetMessage()` helper.
  - Emits the shared hard-floor `heroThrownGenericObjectFloorMessage()` before landing and falling-object HP loss.
  - Preserves corpse-specific weight damage, breaktest RNG consumption, shop-aware landing, and landing-before-death ordering.

## Tests

- `upward hero-thrown ordinary corpse self-hits, damages, and lands`
  - Pins the new hard-floor corpse line without changing damage or RNG order.
- `upward hero-thrown heavy ordinary corpse hard helmet caps falling damage`
  - Pins hard-helmet success plus the hard-floor corpse line.
- `upward hero-thrown ordinary corpse applies half physical damage after bonuses`
  - Keeps half-physical corpse damage covered with the new floor line.
- `upward hero-thrown ordinary corpse lands before fatal falling-object damage`
  - Asserts the floor line appears before the fatal `You die...` message.
- `upward hero-thrown ordinary corpse reports hard helmet failure at fatal HP`
  - Pins `Your helm does not protect you.`, landing, death, and no extra RNG.
- `upward hero-thrown ordinary corpse reports soft hat non-protection`
  - Pins `Your hat does not protect you.` and normal corpse damage.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "upward hero-thrown ordinary corpse" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
