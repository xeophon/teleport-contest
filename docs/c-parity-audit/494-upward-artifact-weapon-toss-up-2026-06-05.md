# C Parity Audit 494: Upward Artifact Weapon Toss-Up

Artifact weapons thrown upward now enter the same C `toss_up()` falling-object path as ordinary supported weapons. Before this slice, the JS support predicate rejected artifact weapons, so an upward artifact dagger fell through to direction command assist instead of self-hitting, landing, and applying falling-object damage.

No replay maps, private seeds, player names, move-count branches, or fixture-specific runtime branches are used. The canary uses normal deterministic test RNG and asserts the live RNG call shape.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1588`: upward hero throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1291`: after the object falls back, non-potion objects run a second `breaktest(obj)` before generic damage.
- `nethack-c/upstream/src/dothrow.c:1341` through `:1349`: generic falling-object damage starts with `dmgval(obj, &gy.youmonst)`.
- `nethack-c/upstream/src/dothrow.c:1351` through `:1354`: artifact self-hits call `artifact_hit()` with a fake `rn1(18, 2)` die roll before continuing through the generic path.
- `nethack-c/upstream/src/zap.c:1458` through `:1464`: `breaktest()` artifact resistance consumes `rn2(100)` and resists when the roll is below the artifact chance.
- `nethack-c/upstream/src/dothrow.c:1420` through `:1423`: the object lands via `hitfloor(obj, TRUE)` before falling-object HP loss.

## JS Changes

- `js/cmd.js`
  - `isSupportedTossUpWeaponObject()` no longer excludes `artifact`/`oartifact` weapons from the modeled upward weapon table.
  - `heroThrownGenericObjectFallingDamage()` consumes `rn1(18, 2)` for artifact identities after the weapon damage roll, matching the C `artifact_hit()` fake die-roll position for this narrow path.

This does not implement full `artifact_hit()` special effects. Beheading, life-drain, Magicbane, elemental, and similar artifact-side-effect behavior remain separate source-backed work.

## Tests

- `upward hero-thrown artifact dagger uses toss-up damage path`
  - Pins that an artifact dagger thrown upward no longer opens direction command assist.
  - Asserts the self-hit message, floor landing, inventory removal, landed artifact identity, HP loss derived from the logged `rnd(4)`, and RNG order `rn2(5)`, artifact `breaktest()` `rn2(100)`, weapon `rnd(4)`, artifact fake die `rn2(18)`, landing `rn2(100)`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "upward hero-thrown .*dagger" test/shop-billing-helpers.test.mjs` - pass, 15 matching tests
- `node --test --test-name-pattern "upward hero-thrown" test/shop-billing-helpers.test.mjs` - pass, 117 matching tests
- `node --test test/shop-billing-helpers.test.mjs` - pass, 1801 tests
- `node --test` - pass, 1952 tests
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
