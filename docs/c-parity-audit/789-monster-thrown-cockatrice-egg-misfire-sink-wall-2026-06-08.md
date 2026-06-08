# C Parity Audit 789: Monster-Thrown Cockatrice Egg Misfire, Sink, and Wall Stops

Implemented the next production monster-thrown petrifying egg projectile slice: cursed/greased egg slip misfires, zero-vector drops, redirected terrain stops, visible sink feedback, and ordinary wall/door obstruction landing. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/src/weapon.c:484` and `:542`: `select_rwep()` prioritizes touch-petrifying eggs for monster ranged attacks.
- `nethack-c/upstream/src/mthrowu.c:291` and `:300`: `monshoot()` emits the visible monster throw message before entering `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:622` through `:633`: cursed or greased thrown objects have a `!rn2(7)` misfire chance; non-ammo eggs use the "slips as ... throws it!" wording; redirected `dx/dy` comes from `rn2(3)-1`, and a zero-vector misfire drops at the launch square.
- `nethack-c/upstream/src/mthrowu.c:552` and `:639`: monster projectile flight stops before map-edge/obstructed/closed-door/iron-bars obstacles and drops at the current square for blocked preflight.
- `nethack-c/upstream/src/monmove.c:2181`: C's closed-door predicate treats closed and locked doors as blocking projectile flight.
- `nethack-c/upstream/src/mthrowu.c:798`: each in-flight square consumes the `!rn2(5)` forced-hit terrain roll.
- `nethack-c/upstream/src/mthrowu.c:804` through `:807`: visible sink stops print "drops onto the sink" or hallucinated "plops".
- `nethack-c/upstream/src/mthrowu.c:815`: ordinary wall/door stops land the object on the last open square without wall feedback.
- `nethack-c/upstream/src/mthrowu.c:170`, `:177`, and `:184` through `:185`: `drop_throw()` destroys eggs only for hit contact (`ohit && EGG`); non-hit zero-vector, sink, wall, and ordinary terrain drops remain intact.

## JS Changes

- `js/allmain.js`
  - Added a shared monster-thrown egg finish path for normal, terrain-stop, and misfire branches so message-more resume state stays consistent.
  - Added cursed/greased egg misfire handling with C-shaped `rn2(7)` slip chance, `rn2(3)-1` redirected vector, same-vector fallthrough, and zero-vector landing at the monster's actual launch square.
  - Added ordinary blocked-next-square handling for eggs, covering map bounds, `IS_OBSTRUCTED()` terrain, and closed/locked doors.
  - Added sink stop handling for aimed and redirected egg flight, including visible "drops/plops onto the sink" wording and intact egg landing.
  - Reused egg terrain landing for iron bars, ordinary obstacles, sink stops, and misfire drops while preserving hit-only egg breakage.
  - Routes visible follow-up messages through the existing after-more queue so slip messages are not overwritten by later sink or hit/catch feedback.
- `test/shop-billing-helpers.test.mjs`
  - Added canaries for aimed sink stop, redirected greased-egg sink stop, redirected greased-egg ordinary wall stop, and cursed zero-vector slip landing at the thrower's launch square.

## Tests

- `production monster cockatrice egg aimed shot drops onto visible sink before hero`
- `production monster greased cockatrice egg redirected slip drops onto visible sink`
- `production monster greased cockatrice egg redirected slip stops before ordinary wall`
- `production monster cursed cockatrice egg zero-vector slip lands at thrower`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster (cockatrice egg aimed shot drops|greased cockatrice egg redirected|cursed cockatrice egg zero-vector|cockatrice egg forced iron bars|cockatrice egg hit starts|cockatrice egg miss lands|cockatrice egg petrifies intervening)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster (cockatrice egg|Kop|dart)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broader monster-thrown egg terrain interactions outside this projectile branch remain separate source-backed slices.
