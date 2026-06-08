# C Parity Audit 793: Monster-Thrown Passive Grease, Proof, and Hero-Hit Order

Closed the two follow-ups left by audit 792: greased floor-object passive erosion and visible hero-hit monster-thrown landing order. This slice also corrected a proof-bit mismatch where JS treated a `rustproof` marker as corrosion proof even when `oerodeproof` was false. Runtime behavior remains source-derived and does not add replay-map or seed-specific production logic.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:75`: `thitu()` prints the hit message, applies `losehp(dam, ...)`, then calls `exercise(A_STR, FALSE)` before returning to the throw path.
- `nethack-c/upstream/src/mthrowu.c:722` through `:786`: monster projectile delivery computes damage and hit value, calls `thitu()`, processes poison/blind/egg tails, stops occupations, then calls `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/mthrowu.c:162` through `:190` and `:494`: `drop_throw()` applies floor effects and `passive_obj()` before stacking, with `ohit` threaded from the hit result.
- `nethack-c/upstream/src/uhitm.c:6146` through `:6177`: `passive_obj()` gates `AD_ACID` with one `rn2(6)`, runs `AD_CORR` without that gate, and does not attempt passive erosion for cancelled corrosion targets.
- `nethack-c/upstream/src/trap.c:193`, `:221`, `:246`, `:301`, and `:377`: passive erosion calls use non-destroying erosion flags, check grease before material/proof/blessed handling, can dissolve grease with `rn2(2)`, and silently return without erosion when grease protects the object.
- `nethack-c/upstream/include/obj.h:461`: NetHack stores one erosion-proof bit; rustproof/corrodeproof wording is material-dependent presentation, not separate immunity classes.

## JS Changes

- `js/cmd.js`
  - Changed direct-melee and monster-thrown passive erosion proof checks so `rustproof` only protects rust erosion. Corrosion and acid now require `oerodeproof`.
  - Moved queued `_monster_throw_after_more` landing after deferred hero damage and `exercise` processing, matching `thitu()` before `drop_throw()`.
  - Clears queued monster-thrown landing if deferred poison kills the hero, matching the existing launcher-arrow cleanup behavior.
- `js/allmain.js`
  - Added `finishMonsterThrownHeroLanding()` and routed visible hero-square landings for sling ammo, boulders, spears, shuriken, plain daggers, and knives through the shared after-more queue.
  - Kept terrain stops and intervening-monster landings immediate; those paths are not waiting for the hero-hit `thitu()` tail.
- `test/shop-billing-helpers.test.mjs`
  - Added greased `AD_ACID` and `AD_CORR` canaries where grease dissolves before stacking, proving the projectile stays uncorroded and then merges with a clean stack.
  - Added a monster-thrown rustproof-only dagger corrosion canary and a direct-melee rustproof-only weapon corrosion canary.
  - Converted the big-polyself plain-dagger canary to a visible hero-hit path and added pre-`nhgetch` snapshots proving HP, damage, exercise, and landing queue state before More is dismissed.

## Tests

- `production monster greased dagger acid hit consumes grease before stacking`
- `production monster greased dagger corrosion hit consumes grease before stacking`
- `production monster rustproof-only dagger corrosion still corrodes before stacking`
- `direct hero melee rustproof-only weapon still corrodes against black pudding`
- `production monster plain dagger big polyself hit corrodes landing object before stacking`
- Existing branch smoke coverage for monster-slung rocks, boulders, spears, shuriken, ordinary knives, and queued eggs.

## Verification

- `node --check js/allmain.js && node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern ... test/shop-billing-helpers.test.mjs` for grease, proof, visible polyself, and queued egg canaries - pass
- Broader helper-converted projectile branch subset - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The generic monster projectile family still has broader non-hero landing and migration work outside this passive-object/order slice, but the audit 792 greased passive and visible hero-hit ordering gaps are closed here.
