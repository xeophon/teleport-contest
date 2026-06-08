# C Parity Audit 794: Monster-Thrown Dart Visible Hero Drop Order

Closed a narrow production dart follow-up left in the monster projectile list: visible kobold-family dart throws now queue hero-square `drop_throw()` landing until after the visible hit/miss message, deferred damage, and Strength exercise. This keeps the runtime source-derived and does not add replay-map or seed-specific logic.

## Source Anchors

- `nethack-c/upstream/src/weapon.c:498` and `:627`: `select_rwep()` can choose `DART` as a hand-thrown ranged weapon; darts do not require a launcher.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: `monshoot()` prints the visible throw message, computes multishot, and calls `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:593` through `:646`: `m_throw()` extracts or splits exactly one object into `singleobj` before flight and handles cursed/greased misfire before normal traversal.
- `nethack-c/upstream/src/mthrowu.c:687` through `:789`: hero-square delivery runs catch/potion checks, computes default weapon damage and `hitv`, calls `thitu()`, applies poison/blind/egg tails, stops occupations, then calls `drop_throw(singleobj, hitu, u.ux, u.uy)` for actual hits.
- `nethack-c/upstream/src/mthrowu.c:75` through `:153`: `thitu()` prints hit/miss wording, applies hit damage with `losehp()`, and exercises Strength before returning to the throw path.
- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` only runs `should_mulch_missile()` when `ohit` is true and then places, applies hit-only passive object effects, and stacks.
- `nethack-c/upstream/src/mthrowu.c:1499` through `:1521`: darts normally pass through iron bars because `-P_DART` is exempt from ordinary `hits_bars()` contact; the caller's forced-hit roll can still make them stop.

## JS Changes

- `js/allmain.js`
  - Added the visible `The <monster> throws a dart!` front message in the production kobold dart branch before flight.
  - For visible hero-square dart hits and misses, routes landing through `finishMonsterThrownHeroLanding(..., { afterMore: true })` so `_monster_throw_after_more` is resolved after deferred damage and exercise in `rhack()`.
  - Keeps invisible/blind single-message dart hits immediate, matching the absence of a visible throw-message More boundary.
  - Keeps dart iron-bars stops as `ohit: false`; visible floor-effect follow-up messages are routed after the throw message's More boundary.
  - Stops the dart throw branch after a successful throw instead of falling through into unrelated post-action noise.
- `test/shop-billing-helpers.test.mjs`
  - Extended `runMonsterDartHitLanding()` with pre-`nhgetch` snapshots for HP, deferred damage, deferred exercise, queued monster-thrown landing, and floor object IDs.
  - Added `production visible kobold dart hit queues landing until after damage and exercise`.

## Tests

- `production visible kobold dart hit queues landing until after damage and exercise`
- Existing production kobold dart hit, stack split, intervening passive, iron-bars pass-through, forced `Clonk!`, and Deaf-silent forced-bars canaries.
- Existing shared non-potion intervening, poisoned dart, and queued monster-thrown landing canaries.

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "production .*kobold dart|production monster thrown non-potion|production monster poisoned thrown missiles|production monster poisoned dart|deferred monster-thrown hit egg|deferred monster-thrown missed egg" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The production dart branch still has broader C `m_throw()` gaps: full `thitu()` AC/range math, hero catch, cursed/greased misfire, and more passive-object variants. Those should remain separate source-backed slices.
