# C Parity Audit 472: Kicked Glass Wand Fragile Preflight

Implemented the C fragile-object preflight for kicked floor glass/crystal wands in the existing non-shop kicked-object projectile path. The slice is source-backed and does not rely on replay maps, private seeds, player names, move counts, or fixture-specific runtime branches.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:610` through `:613`: `dokick()` emits the `You kick ...` message before fragile-object breakage.
- `nethack-c/upstream/src/dokick.c:678` through `:680`: fragile kicked objects call `hero_breaks(gk.kickedobj, gk.kickedobj->ox, gk.kickedobj->oy, 0)` and return immediately when the object breaks.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` runs `breaktest()`, emits `breakmsg()`, then calls `breakobj()` with `hero_caused` true.
- `nethack-c/upstream/src/dothrow.c:2493` through `:2540`: glass/crystal wands have no special `breakobj()` side effect.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2596`: `breaktest()` consumes the object-resistance roll and treats ordinary non-artifact glass, excluding gems, as breakable.
- `nethack-c/upstream/src/dothrow.c:2621` through `:2636`: the default `breakmsg()` branch covers glass or crystal wands and uses the visible `shatters into a thousand pieces` message.
- `nethack-c/upstream/include/objects.h:1449` through `:1455`: `wand of light` has glass appearance/material and `wand of enlightenment` has crystal appearance with glass material.

## JS Changes

- `js/cmd.js`
  - Allows glass/crystal material or appearance wands through the narrow kicked floor-object support gate as C `breaktest()` candidates.
  - Reuses the existing glass-material wand detector and projectile break-message helper for thousand-pieces shatter text.
  - Keeps glass/crystal wand breakage side-effect-free, matching the C `breakobj()` switch.

## Tests

- `command kicked glass wand breaks before remote projectile flight`
  - Kicks a non-shop floor glass-appearance wand toward a seen remote hole.
  - Asserts the C message order: `You kick a glass wand.` before `A glass wand shatters into a thousand pieces!`.
  - Asserts the object is removed, no remote migration is queued, and no hole flight, `Thump!`, hit, or miss message is emitted.
  - Asserts the RNG label sequence is exactly `rn2(100)`.
- Existing upward glass wand coverage still verifies appearance-backed and material-backed thrown self-hit breakage.

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
- The rare 1% glass/crystal wand break-resistance continuation is not generalized beyond the currently supported kicked-object continuation paths.
- Monster-thrown `hits_bars()` fragile-object breakage is separate from this hero-kicked `dokick()` preflight branch.
