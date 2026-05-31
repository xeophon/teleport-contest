# C Parity Audit 343: Plus-Two Launcher Arrow Drop-Throw

## Sources

- `nethack-c/upstream/src/mthrowu.c:262-300`: launcher ammo uses the normal monster shooting path and calls `m_throw()` for each fired projectile.
- `nethack-c/upstream/src/mthrowu.c:593-618`: monster-fired launcher ammo is split or extracted into a single projectile before flight, preserving object fields such as enchantment.
- `nethack-c/upstream/src/mthrowu.c:622-632`: cursed and greased missiles have a separate pre-flight misfire branch, so they remain outside this slice.
- `nethack-c/upstream/src/mthrowu.c:722-787`: arrow damage and to-hit use `singleobj->spe`; nonlethal hero hits call `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/mthrowu.c:798-815`: misses and end-of-flight landings call `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:162-190`: `drop_throw()` applies hit-only missile mulch before shipping, floor effects, passive-object handling, and stacking.
- `nethack-c/upstream/src/dothrow.c:1978-1999`: `should_mulch_missile()` uses `chance = 3 + greatest_erosion(obj) - obj->spe`; clean `+2` arrows use the `chance <= 1` branch and break on `!rn2(4)`.

## JS Changes

- Broadened production launcher-arrow drop-throw routing from clean non-BUC `+0/+1` arrows to clean non-BUC `+2` arrows.
- Left blessed, cursed, greased, and eroded launcher arrows on the legacy path because those states have separate survival, misfire, or damage details.
- Reused `landMonsterThrownObject()` so clean `+2` nonlethal hits run the C-shaped `rn2(4)` hit-only mulch gate and misses persist without mulch RNG.

## Tests

- `production monster plus-two launcher arrow hit lands surviving arrow with rn2(4) mulch` covers nonlethal hit routing, landed `spe: 2` persistence, and the surviving `rn2(4)` branch.
- `production monster plus-two launcher arrow hit can mulch before landing` covers the `!rn2(4)` deletion branch and deletion-resistance `rn2(100)` consumption.
- `production monster plus-two launcher arrow miss lands without ohit mulch` covers the miss path, `spe: 2` floor persistence, and the absence of hit-only mulch RNG.

## Remaining Gaps

- Blessed launcher arrows still need a replay-safe audit of the extra monster-thrown `!rn2(3)` survival roll.
- Cursed and greased launcher arrows still need the C pre-flight `!rn2(7)` misfire branch, including random direction and same-square drop behavior.
- Eroded launcher arrows still need a dedicated persistence and damage audit.
- Lethal launcher-arrow hits remain separate because they can perturb public replay/bones ordering.
- C's full miss flight beyond the hero square remains outside the current simplified production launcher-arrow path.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern 'production monster .*launcher arrow' test/shop-billing-helpers.test.mjs` - 10 pass, 1423 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1433 pass
- `node --test test/*.mjs` - 1572 pass
- `npm run score` - 44/44 passing
