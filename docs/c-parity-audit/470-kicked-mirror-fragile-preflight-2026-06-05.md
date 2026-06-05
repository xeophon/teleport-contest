# C Parity Audit 470: Kicked Mirror Fragile Preflight

Implemented the C fragile-object preflight for a kicked floor mirror in the existing non-shop kicked-object projectile path. The slice is source-backed and does not rely on replay maps, private seeds, player names, move counts, or fixture-specific runtime branches.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:610` through `:613`: `dokick()` emits the `You kick ...` message before fragile-object breakage.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: fragile kicked objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return immediately when the object breaks.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` runs `breaktest()`, emits `breakmsg()`, then calls `breakobj()` with `hero_caused` true.
- `nethack-c/upstream/src/dothrow.c:2493` through `:2497`: `breakobj()` applies `change_luck(-2)` for hero-caused mirror breakage.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2596`: `breaktest()` consumes the object-resistance roll and treats ordinary non-artifact glass, excluding gems, as breakable.
- `nethack-c/upstream/src/dothrow.c:2626` through `:2636`: mirrors use the visible `shatters into a thousand pieces` message.
- `nethack-c/upstream/include/objects.h:936`: mirrors are glass tools.

## JS Changes

- `js/cmd.js`
  - Allows mirrors through the narrow kicked floor-object support gate as C `breaktest()` candidates.
  - Reuses the existing mirror detector and projectile break-message helper for kicked preflight breakage.
  - Applies the C `change_luck(-2)` side effect only after the kicked mirror actually breaks.
  - Routes upward hero-thrown mirror breakage through the same clamped luck helper.

## Tests

- `command kicked mirror breaks before remote projectile flight with bad luck`
  - Kicks a non-shop floor mirror toward a seen remote hole.
  - Asserts the C message order: `You kick a looking glass.` before `A looking glass shatters into a thousand pieces!`.
  - Asserts the object is removed, no remote migration is queued, and no hole flight, `Thump!`, hit, or miss message is emitted.
  - Asserts the hero receives the `-2` mirror luck penalty.
  - Asserts the RNG label sequence is exactly `rn2(100)`.
- Existing upward mirror coverage still verifies the self-hit break path and luck side effect.

## Verification

- `git diff --check` - pass
- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked mirror|command kicked lenses|command kicked fragile crystal ball|upward hero-thrown mirror|upward hero-thrown lenses" test/shop-billing-helpers.test.mjs` - pass, 5 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1754/1754
- `node --test` - pass, 1905/1905
- `node --test test/*.mjs` - pass, 1905/1905
- `npm run score` - pass, 44/44

## Remaining

- Broader kicked fragile objects remain separate: camera demon release, potion breathing, eggs, cream pies, glass/crystal wands, and shop-owned floor-object billing need their own source-backed slices.
- The rare 1% mirror break-resistance continuation is not generalized beyond the currently supported kicked-object continuation paths.
- Monster-thrown `hits_bars()` fragile-object breakage is separate from this hero-kicked `dokick()` preflight branch.
