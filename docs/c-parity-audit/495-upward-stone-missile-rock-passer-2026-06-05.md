# C Parity Audit 495: Upward Stone-Missile Rock-Passer Hits

Stone missiles thrown upward now enter the generic `toss_up()` falling-object path. For rock-passing polyself forms, the object still consumes the generic weight-damage roll, prints the C harmless-hit wording, lands on the hero square, and skips HP loss. If the hero is wearing headgear, the helmet negates the harmless rock-passing result and the capped falling-object damage applies.

No replay maps, private seeds, player names, move-count branches, or fixture-specific runtime branches are used. The canaries use deterministic test RNG only to assert the live RNG call shape.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1588` through `:1589`: upward hero throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1284` through `:1285`: generic self-hit wording says the object falls back on top of the hero's head.
- `nethack-c/upstream/src/dothrow.c:1341` through `:1349`: non-potion, non-breaking generic falling-object handling computes `harmless = stone_missile(obj) && passes_rocks(gy.youmonst.data)` before `dmgval()`.
- `nethack-c/upstream/src/dothrow.c:1351` through `:1354`: artifact self-hit effects are skipped when the impact is harmless.
- `nethack-c/upstream/src/dothrow.c:1356` through `:1380`: generic non-weapon fallback rolls weight damage, caps at 6, applies damage increase, and then half-physical reduction.
- `nethack-c/upstream/src/dothrow.c:1382` through `:1400`: worn headgear reports `Unfortunately, you are wearing a helm/hat.` for harmless stone-missile impacts, then clears `harmless`.
- `nethack-c/upstream/src/dothrow.c:1417` through `:1423`: no-helmet harmless impacts use `hit(..., " but doesn't hurt.")`, land with `hitfloor(obj, TRUE)`, and skip `losehp()`.
- `nethack-c/upstream/include/mondata.h:205` through `:208`: `passes_rocks()` is wall-passing but not unsolid, matching xorns and earth elementals instead of ghosts or shades.
- `nethack-c/upstream/src/zap.c:3555` through `:3567`: `hit()` against the hero prints `The <object> hits you but doesn't hurt.`

## JS Changes

- `js/cmd.js`
  - Adds non-cursed stone missiles to the modeled upward generic falling-object route.
  - Reuses the existing direct-thrown stone-missile and rock-passer predicates for upward self-hits.
  - Threads a harmless flag into generic falling-object damage so artifact fake-hit RNG is skipped for harmless rock-passer impacts, matching C.
  - Emits the C harmless self-hit wording and skips HP loss when no headgear is worn.
  - Emits the C `Unfortunately` helmet wording and applies the capped falling-object damage when headgear negates the harmless rock-passer result.

## Tests

- `upward hero-thrown loadstone passes harmlessly through rock-passing polyself`
  - Pins upward loadstone routing, self-hit wording, floor landing, no command assist, no HP loss, and RNG order `rn2(5)`, `rn2(100)`, `rnd(5)`, `rn2(100)`.
- `upward hero-thrown loadstone helmet negates rock-passer harmlessness`
  - Pins the helmet-negation message, floor landing, one point of polyself HP loss after the hard-helmet cap, retained helmet, and the same RNG order.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown loadstone" test/shop-billing-helpers.test.mjs` - pass, 2 matching tests
- `node --test --test-reporter=dot --test-name-pattern "upward hero-thrown" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
