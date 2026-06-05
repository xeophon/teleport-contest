# C Parity Audit 469: Kicked Crystal Ball Fragile Preflight

Implemented the C fragile-object preflight for a kicked floor crystal ball in the existing non-shop kicked-object projectile path. The slice is source-backed and does not rely on replay maps, private seeds, player names, move counts, or fixture-specific runtime branches.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:560` through `:576`: `dokick()` computes object kick range from the kicked object's C weight before flight.
- `nethack-c/upstream/src/dokick.c:610` through `:613`: the kick feedback message is emitted before fragile-object breakage.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: fragile kicked objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return immediately if the object breaks.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` performs `breaktest()`, emits `breakmsg()`, then calls `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2596`: `breaktest()` consumes the object-resistance roll and treats ordinary non-artifact glass, excluding gems, as breakable.
- `nethack-c/upstream/src/dothrow.c:2626` through `:2638`: crystal balls use the visible `shatters into a thousand pieces` message.
- `nethack-c/upstream/include/objects.h:938`: a crystal ball is a charged glass tool, not a gem or weapon projectile.

## JS Changes

- `js/cmd.js`
  - Allows crystal balls through the narrow kicked floor-object support gate even though they are C `breaktest()` candidates.
  - Adds a crystal-ball-only fragile preflight helper for kicked floor objects.
  - Runs the break roll after the `You kick ...` message and before range, monster-impact, or remote-gate handling.
  - On break, emits the existing thousand-pieces message helper, removes the object from the floor, redraws the source square, and stops before migration/flight.

## Tests

- `command kicked fragile crystal ball breaks before remote projectile flight`
  - Kicks a non-shop floor crystal ball toward a seen remote hole.
  - Asserts the C message order: `You kick a crystal ball.` before `A crystal ball shatters into a thousand pieces!`.
  - Asserts the object is removed, no remote migration is queued, and the message never reports hole flight, `Thump!`, hit, or miss.
  - Asserts the RNG label sequence is exactly `rn2(100)`.
- Neighboring kicked ordinary-object down-gate tests still cover the unchanged non-fragile movement path.

## Verification

- `git diff --check` - pass
- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked fragile crystal ball|command kick ordinary floor object through seen remote hole|command kick ordinary floor object down stairs|command kicked ordinary dagger|command kicked ordinary knife|command kicked glass gem" test/shop-billing-helpers.test.mjs` - pass, 8 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1752/1752
- `node --test` - pass, 1903/1903
- `node --test test/*.mjs` - pass, 1903/1903
- `npm run score` - pass, 44/44

## Remaining

- Broader kicked fragile objects remain separate: mirror luck, camera demon release, potion breathing, eggs, cream pies, lenses, glass/crystal wands, and shop-owned floor-object billing need their own source-backed slices.
- The rare 1% crystal-ball break-resistance continuation is not generalized beyond the currently supported kicked-object continuation paths.
- Monster-thrown `hits_bars()` fragile-object breakage is separate from this hero-kicked `dokick()` preflight branch.
