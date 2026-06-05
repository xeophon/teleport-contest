# C Parity Audit 500: Monster Boulder Point-Blank Iron-Bars Preflight

Stationary rock-throwing monsters with a carried boulder can now reach the monster ranged branch even when ordinary movement did not move them. This exposes the existing point-blank iron-bars preflight path: an adjacent boulder throw stops on the monster's launch square, survives the break-resistance check, emits `Whang!` for non-deaf heroes, and does not consume the in-flight force-hit roll.

No replay maps, private seeds, player names, move-count branches, or fixture-specific runtime branches are used. The canary boxes the monster with normal obstructing terrain so the live scheduler reaches the no-move ranged attack path.

## Source Anchors

- `nethack-c/upstream/src/monmove.c:903` through `:971`: when movement does not happen or does not consume the turn, C proceeds to standard attacks rather than abandoning the monster turn.
- `nethack-c/upstream/src/mthrowu.c:1174` through `:1262`: `thrwmu()` selects a ranged weapon, checks `lined_up()`, and calls `monshoot()`.
- `nethack-c/upstream/src/weapon.c:533` through `:547`: `select_rwep()` selects boulders for monsters whose data satisfies `throws_rocks()`.
- `nethack-c/upstream/src/mthrowu.c:552` through `:566`: `MT_FLIGHTCHECK` checks the adjacent terrain square for walls, doors, iron bars, and sinks.
- `nethack-c/upstream/src/mthrowu.c:639` through `:642`: point-blank `MT_FLIGHTCHECK(TRUE, 0)` drops the object at the launch square before any in-flight force-hit roll.
- `nethack-c/upstream/src/mthrowu.c:798` through `:815`: only in-flight blocked checks consume `forcehit = !rn2(5)` before stopping and dropping the object.
- `nethack-c/upstream/src/mthrowu.c:1417` through `:1468`: surviving boulders use `Whang!`, suppressed by `Deaf`.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2608`: the surviving boulder path still reaches `obj_resists()` through `breaktest()`, consuming the break-resistance RNG.

## JS Changes

- `js/allmain.js`
  - Lets stationary monsters with a valid boulder throw opportunity bypass the early non-nearby no-move continue, so the later ranged branch can run.
  - Reuses the audit 499 point-blank boulder bars branch for launch-square landing, `rn2(100)`, `Whang!`, and no hero hit/catch/damage handling.

## Tests

- `production monster boulder point-blank iron bars whang without force roll`
  - Boxes a stone giant so movement cannot consume the turn, then asserts a point-blank boulder bars stop at the launch square.
  - Pins boulder inventory removal, `Whang!`, one `rn2(100)`, no damage/catch/mulch RNG, and no third in-flight `rn2(5)` force-roll cadence.

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster boulder" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster (boulder|sling rock aimed)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
