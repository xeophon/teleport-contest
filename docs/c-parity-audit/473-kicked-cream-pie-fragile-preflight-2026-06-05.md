# C Parity Audit 473: Kicked Cream Pie Fragile Preflight

Implemented the C fragile-object preflight for a kicked floor cream pie in the existing non-shop kicked-object projectile path. The slice is source-backed and does not rely on replay maps, private seeds, player names, move counts, or fixture-specific runtime branches.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:610` through `:613`: `dokick()` emits the `You kick ...` message before fragile-object breakage.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: fragile kicked objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return immediately when the object breaks.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` runs `breaktest()`, emits `breakmsg()`, then calls `breakobj()` with `hero_caused` true.
- `nethack-c/upstream/src/dothrow.c:2493` through `:2540`: cream pies have no special `breakobj()` side effect.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2602`: `breaktest()` consumes the object-resistance roll and treats cream pies as breakable.
- `nethack-c/upstream/src/dothrow.c:2642` through `:2644`: visible cream pie breakage prints `What a mess!`.
- `nethack-c/upstream/include/objects.h:1100`: cream pie is a food object with weight 10.

## JS Changes

- `js/cmd.js`
  - Allows cream pies through the narrow kicked floor-object support gate as C `breaktest()` candidates.
  - Reuses the existing cream-pie detector and projectile break-message helper for `What a mess!`.
  - Keeps kicked cream-pie breakage side-effect-free: no blindness, no vapor, no luck change, and no shop billing in the non-shop slice.

## Tests

- `command kicked cream pie breaks before remote projectile flight`
  - Kicks a non-shop floor cream pie toward a seen remote hole.
  - Asserts the C message order: `You kick a cream pie.` before `What a mess!`.
  - Asserts the object is removed, no remote migration is queued, and no hole flight, `Thump!`, hit, miss, or blindness message is emitted.
  - Asserts the RNG label sequence is exactly `rn2(100)`.
- Existing thrown cream-pie coverage remains separate because that is hit delivery, not `dokick()` fragile preflight breakage.

## Verification

- `git diff --check` - pass
- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked glass wand|command kicked cream pie|command kicked mirror|command kicked lenses|command kicked fragile crystal ball|upward hero-thrown unknown glass wand" test/shop-billing-helpers.test.mjs` - pass, 6 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1756/1756
- `node --test` - pass, 1907/1907
- `node --test test/*.mjs` - pass, 1907/1907
- `npm run score` - pass, 44/44

## Remaining

- Broader kicked fragile objects remain separate: camera demon release, potion breathing, eggs, and shop-owned floor-object billing need their own source-backed slices.
- The rare 1% cream-pie break-resistance continuation is not generalized beyond the currently supported kicked-object continuation paths.
- Monster-thrown `hits_bars()` fragile-object breakage is separate from this hero-kicked `dokick()` preflight branch.
