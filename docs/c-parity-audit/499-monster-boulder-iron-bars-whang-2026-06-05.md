# C Parity Audit 499: Monster-Thrown Boulder Iron-Bars Whang

Stone giants and other rock-throwing monsters can now use carried boulders in the live monster ranged-attack path. A boulder thrown at iron bars stops before the bars, survives the C break test, emits `Whang!` for non-deaf heroes, and lands at the projectile stop square without hitting the hero behind the bars.

No replay maps, private seeds, player names, move-count branches, or fixture-specific runtime branches are used. The canaries use deterministic test RNG only to assert the live C-shaped call order.

## Source Anchors

- `nethack-c/upstream/src/makemon.c:180` through `:184`: giants sometimes receive a boulder via `mongets()`.
- `nethack-c/upstream/src/weapon.c:533` through `:547`: `select_rwep()` selects boulders for monsters whose data satisfies `throws_rocks()`.
- `nethack-c/upstream/src/mthrowu.c:262` through `:299`: `monshoot()` prints the monster throw message and calls `m_throw()` for each shot.
- `nethack-c/upstream/src/mthrowu.c:552` through `:566`: `MT_FLIGHTCHECK` routes iron-bars collisions through `hits_bars()`.
- `nethack-c/upstream/src/mthrowu.c:639` through `:642`: point-blank flight checks drop the object at the launch square when terrain blocks.
- `nethack-c/upstream/src/mthrowu.c:798` through `:815`: in-flight `m_throw()` consumes `rn2(5)` for `forcehit`, then drops surviving blocked objects at `gb.bhitpos`.
- `nethack-c/upstream/src/mthrowu.c:1417` through `:1468`: `hit_bars()` calls `breaks()` before sound output; surviving boulders and iron balls use the `Whang!` sound, suppressed by `Deaf`.
- `nethack-c/upstream/src/mthrowu.c:1499` through `:1534`: `hits_bars()` treats `ROCK_CLASS` objects, including boulders, as bars hits rather than pass-through objects.
- `nethack-c/upstream/src/dothrow.c:2444` through `:2451`: non-hero breakage calls `breaktest()` before deciding whether the object is gone.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2608`: `breaktest()` calls `obj_resists()`; boulders survive the break test after consuming the resistance RNG.

## JS Changes

- `js/allmain.js`
  - Adds production boulder selection for rock-throwing monsters carrying boulders.
  - Routes boulder throws through the existing monster projectile split and floor-landing helpers.
  - Handles iron-bars stops before hero impact, including the C-shaped `rn2(5)` force-hit cadence, `rn2(100)` break-resistance check, `Whang!`/deaf behavior, inventory removal, and landing-square placement.

## Tests

- `production monster boulder aimed shot whangs iron bars before hero`
  - Pins visible throw wording, `Whang!`, boulder inventory removal, landing before the bars, no hero damage, no catch path, one `rn2(100)`, and no damage roll.
- `production monster boulder aimed iron bars are silent when deaf`
  - Pins the same live throw and landing behavior with sound suppressed by deafness.

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster boulder" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster (boulder|sling rock aimed)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
