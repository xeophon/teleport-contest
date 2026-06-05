# C Parity Audit 483: Kicked Glass Armor Preflight Crack

Implemented kicked floor-object preflight handling for crackable glass armor. C does not route glass armor through ordinary thousand-pieces glass shatter: `breaktest()` gives glass armor a 90 percent nonbreak chance, `breakmsg()` is silent for crackable armor, and `breakobj()` calls `erode_obj(..., ERODE_CRACK, EF_DESTROY | EF_VERBOSE)`. A surviving crack returns false from `hero_breaks()`, so the kick continues into low-range or flight handling; only fully eroded armor shattering returns true and stops the kick.

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:558` through `:588`: kicked-object range is computed before fragile preflight and uses one-item stack weight for non-gold stacks.
- `nethack-c/upstream/src/dokick.c:610` through `:613`: kicking a floor object prints `You kick ...` before fragile, low-range, split, or flight handling.
- `nethack-c/upstream/src/dokick.c:678` through `:695`: `hero_breaks()` runs before low-range and stack splitting, but only stops the kick when it returns true.
- `nethack-c/upstream/src/dothrow.c:2417` through `:2435`: `hero_breaks()` calls `breaktest()`, then silent-or-visible `breakmsg()`, then returns the `breakobj()` result.
- `nethack-c/upstream/src/dothrow.c:2489` through `:2491`: crackable armor routes through `erode_obj(..., ERODE_CRACK, EF_DESTROY | EF_VERBOSE)` and returns true only for `ER_DESTROYED`.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2596`: glass armor uses `nonbreakchance = 90` before the non-artifact, non-gem glass-material break branch.
- `nethack-c/upstream/src/dothrow.c:2616` through `:2617`: `breakmsg()` returns silently for crackable armor, leaving crack/shatter wording to erosion.
- `nethack-c/upstream/src/trap.c:277` through `:301`: crack erosion increments `oeroded` with `The <armor> cracks...` messages until max erosion, where `EF_DESTROY` produces `The <armor> shatters!`.

## JS Changes

- `js/cmd.js`
  - Admits `isHeroThrownCrackableArmorObject()` into `kickedFragilePreflightBreakKind()` with a separate `crackableArmor` classifier.
  - Branches crackable armor before `projectileTopLevelBreakKind()` so kicked glass armor uses the existing `crackableArmorImpact()` erosion path rather than ordinary glass shatter.
  - Leaves non-destroying crack results in place and returns false so the existing C-order low-range/flight continuation handles the rest of the kick.
  - Removes fully shattered armor locally and stops the kick before low-range, split, or remote flight.

## Tests

- `command kicked crystal plate mail crack erosion continues to low-range thump`
  - Kicks glass crystal plate mail with a break roll that cracks but does not destroy it.
  - Asserts `The mail cracks!`, `oeroded = 1`, the object remains on the source square, and low-range `Thump!` follows with RNG order `rn2(100)`, then `rn2(3)`.
- `command kicked fully cracked crystal plate mail shatters before remote projectile flight`
  - Kicks fully cracked crystal plate mail in front of a seen remote hole.
  - Asserts `The mail shatters!`, the object is removed, no remote migration is queued, and no low-range, hit/miss, or muffled remote impact messages occur.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked (glass-material object|crystal plate mail|fully cracked crystal plate mail)|command kicked fragile stack resistance" test/shop-billing-helpers.test.mjs` - pass, 5 matching tests
- `git diff --check` - pass
- `node --test` - pass, 1925 tests
- `npm run score` - pass, 44/44

## Remaining

- Generic local venom placeholders remain excluded unless resolved to concrete acid/blinding venom.
