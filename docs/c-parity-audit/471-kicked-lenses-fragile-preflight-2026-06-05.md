# C Parity Audit 471: Kicked Lenses Fragile Preflight

Implemented the C fragile-object preflight for kicked floor lenses in the existing non-shop kicked-object projectile path. The slice is source-backed and does not rely on replay maps, private seeds, player names, move counts, or fixture-specific runtime branches.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:610` through `:613`: `dokick()` emits the `You kick ...` message before fragile-object breakage.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: fragile kicked objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return immediately when the object breaks.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` runs `breaktest()`, emits `breakmsg()`, then calls `breakobj()` with `hero_caused` true.
- `nethack-c/upstream/src/dothrow.c:2493` through `:2540`: lenses have no special `breakobj()` side effect; unlike mirrors, cameras, potions, and eggs.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2596`: `breaktest()` consumes the object-resistance roll and treats ordinary non-artifact glass, excluding gems, as breakable.
- `nethack-c/upstream/src/dothrow.c:2626` through `:2636`: lenses use the visible `shatters into a thousand pieces` message.
- `nethack-c/upstream/include/objects.h:944` through `:945`: lenses are glass eyewear tools.

## JS Changes

- `js/cmd.js`
  - Allows lenses through the narrow kicked floor-object support gate as C `breaktest()` candidates.
  - Reuses the existing projectile break-message helper for pair wording and thousand-pieces shatter text.
  - Keeps lenses side-effect-free after breakage, matching the C `breakobj()` switch.

## Tests

- `command kicked lenses break before remote projectile flight`
  - Kicks non-shop floor lenses toward a seen remote hole.
  - Asserts the C message order: `You kick a pair of lenses.` before `A pair of lenses shatters into a thousand pieces!`.
  - Asserts the object is removed, no remote migration is queued, and no hole flight, `Thump!`, hit, or miss message is emitted.
  - Asserts no mirror-style luck penalty is applied.
  - Asserts the RNG label sequence is exactly `rn2(100)`.
- Existing upward lenses coverage still verifies pair wording through the thrown self-hit break path.

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
- The rare 1% lenses break-resistance continuation is not generalized beyond the currently supported kicked-object continuation paths.
- Monster-thrown `hits_bars()` fragile-object breakage is separate from this hero-kicked `dokick()` preflight branch.
