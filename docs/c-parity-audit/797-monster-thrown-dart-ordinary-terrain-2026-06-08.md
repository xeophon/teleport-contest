# C Parity Audit 797: Monster-Thrown Dart Ordinary Terrain

Closed the next production dart terrain follow-up after audit 796. Ordinary, non-misfired monster-thrown darts now run C-shaped preflight blocking before entering closed doors and post-step terrain stops for visible sinks and next-square blockers. This stays inside the kobold dart branch and does not relax the existing production `clearShot` gate for hard walls.

## Source Anchors

- `nethack-c/upstream/src/weapon.c:498`, `:627`, and `:661`: hand-thrown darts are selected from the ranged-weapon list with `gp.propellor = &hands_obj`.
- `nethack-c/upstream/src/mthrowu.c:274` through `:300`: visible monster throw wording is emitted before the projectile reaches `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:593` through `:646`: `m_throw()` extracts or splits a singleton object and only diverts into the cursed/greased slip branch when that gate fires; clean darts continue into ordinary flight.
- `nethack-c/upstream/src/mthrowu.c:552` through `:567`: `MT_FLIGHTCHECK(TRUE, 0)` checks the next square before flight for map edge, ordinary obstruction, closed doors, and non-forced iron-bars behavior; sinks are not preflight blockers.
- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: the ordinary flight loop advances one square, then checks intervening monsters and hero-square delivery before terrain.
- `nethack-c/upstream/src/mthrowu.c:798` through `:814`: after each traveled square, C consumes the force-hit roll, checks range/terrain, emits visible sink feedback when range remains, and drops the projectile on the current square.
- `nethack-c/upstream/src/mthrowu.c:1447`, `:1503`, and `:1517`: darts normally pass iron bars, while forced bar hits stop before the bars and use ordinary `Clonk!` feedback unless the hero is deaf.

## JS Changes

- `js/allmain.js`
  - Added the ordinary dart preflight terrain check after the C-shaped slip/no-slip decision and before the normal flight loop.
  - Added ordinary dart post-step visible sink handling with C's `drops`/hallucination `plops` wording.
  - Added normal-loop next-square blocker checks through the existing dart terrain helper, preserving intervening-monster and forced iron-bars ordering.

## Tests

- `production visible kobold dart aimed shot drops onto visible sink before hero`
- `production visible kobold dart aimed shot stops before closed door`
- Existing production kobold dart hit, catch, misfire, stack split, intervening passive, and aimed iron-bars canaries.

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=dot --test-name-pattern "production .*kobold .*dart" test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Hard-wall ordinary dart stops are still limited by the production dart `clearShot` selection gate; relaxing that gate should be a separate source-backed slice because it changes whether kobolds throw at all when `IS_OBSTRUCTED` terrain lies between monster and hero.
- Production dart delivery still lacks full `thitu()` AC/range/bigmon/`Maybe_Half_Phys()` details, additional poison side effects, and broader passive-object variants.
