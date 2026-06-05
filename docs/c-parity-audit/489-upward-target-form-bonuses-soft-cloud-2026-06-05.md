# C Parity Audit 489: Upward Target Form Bonuses And Soft Cloud Landing

Broadened generic upward falling-object damage for hero target-form effects. Supported upward weapons and weight-fallback objects now apply C's blessed and silver target bonuses against vulnerable polyself forms, silver-hating forms see the falling-object searing message, silver objects bypass hard-helmet damage capping for silver-hating forms, and cloud/air terrain uses the same soft landing suppression as C `hitfloor()`.

No replay maps, private seeds, player names, move-count branches, or fixture-specific production branches are used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1588`: upward hero throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1341` through `:1423`: generic upward falling-object damage uses `dmgval()` first, falls back to weight damage when needed, applies the hard-helmet `less_damage` cap only when the object is not silver or the hero does not hate silver, prints `The silver sears you!`, calls `hitfloor(obj, TRUE)`, then applies falling-object HP loss.
- `nethack-c/upstream/src/weapon.c:225` through `:344`: `dmgval()` applies weapon base damage, enchantment clamping, shade handling, blessed `rnd(4)` damage against blessing-haters, silver `rnd(20)` damage against silver-haters, then erosion.
- `nethack-c/upstream/src/mondata.c:517` through `:543`: silver-haters are vampshifters, werecreatures, vampires, demons, shades, and imp-class monsters except tengu; blessing-haters are vampshifters, undead, and demons.
- `nethack-c/upstream/include/youprop.h:401`: hero `Hate_silver` also includes active lycanthropy.
- `nethack-c/upstream/src/dothrow.c:603` through `:647`: `hitfloor()` early-exits on soft terrain before printing a floor-hit message.
- `nethack-c/upstream/include/rm.h:140`: `IS_SOFT` includes air, cloud, and pools.

## JS Changes

- `js/cmd.js`
  - Added upward target-form helpers for blessing hate, silver hate, shade handling, and silver material detection through the existing material resolver.
  - Applied blessed and silver `dmgval()` bonus rolls inside supported upward weapon damage before erosion.
  - Applied the same target-form bonus rolls in the weight-fallback path for nonweapon generic upward objects.
  - Replaced hard-helmet capping with C's `less_damage` predicate, so silver objects do not cap damage when the current form hates silver.
  - Added the upward self-hit `The silver sears you!` message before landing.
  - Made projectile soft landing recognize `IS_SOFT`, covering cloud/air in addition to existing pool-style terrain.

## Tests

- `upward hero-thrown blessed dagger gets undead-polyself damage bonus`
- `upward hero-thrown silver dagger sears silver-hating polyself`
- `upward hero-thrown dagger on cloud skips hard floor message`

The new tests pin the added C RNG order: blessed vulnerable-form damage consumes a second `rnd(4)`, silver vulnerable-form damage consumes `rnd(20)` and emits the searing message before the floor-hit line, and cloud landing suppresses the hard-floor message while still landing the object.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown (blessed dagger gets undead-polyself damage bonus|silver dagger sears silver-hating polyself|dagger on cloud skips hard floor message|blessed dagger keeps ordinary toss-up flow|silver dagger uses ordinary damage without silver-hate bonus|plain dagger hard helmet caps falling damage)" test/shop-billing-helpers.test.mjs` - pass, 6 matching tests
- `node --test --test-name-pattern "upward hero-thrown" test/shop-billing-helpers.test.mjs` - pass, 106 matching tests
- `node --test` - pass, 1941 tests
- `npm run score` - pass, 44/44 public sessions

## Remaining

- Full C parity still needs large-target upward weapon dice for big polyself forms, additional shade edge canaries, fatal heavy-container canaries, and deeper `hitfloor()` landing side effects beyond the currently modeled paths.
