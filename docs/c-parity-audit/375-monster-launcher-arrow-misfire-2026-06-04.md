# Monster Launcher Arrow Misfire

Date: 2026-06-04

## Summary

Added the covered cursed/greased monster launcher-arrow preflight branch from C `m_throw()`. After a monster extracts a single arrow and prints the visible shoot message, cursed or greased ammo has a `!rn2(7)` chance to misfire: a zero-vector misfire drops the arrow at the shooter, a redirected misfire flies away with `ohit=false`, and a non-misfire still uses the normal `drop_throw()` landing path.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:170` through `:190`: `drop_throw()` checks hit-only missile breakage first, then places the object and runs passive object handling.
- `nethack-c/upstream/src/mthrowu.c:274` through `:300`: `monshoot()` prints the visible volley message and calls `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts or splits a single missile before the misfire branch.
- `nethack-c/upstream/src/mthrowu.c:622` through `:635`: cursed or greased ammo rolls `rn2(7)` for preflight misfire, then rolls a redirected direction; zero-vector misfires drop at `gb.bhitpos` with `ohit=false`.
- `nethack-c/upstream/src/mthrowu.c:673` through `:824`: normal flight consumes the per-square `rn2(5)` path checks and lands misses with `ohit=false`.
- `nethack-c/upstream/src/mthrowu.c:787` through `:789`: nonlethal hero hits call `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/dothrow.c:1976` through `:1993`: `should_mulch_missile()` depends on ammo/missile type, erosion, enchantment, and blessedness; cursed and greased status do not exclude drop-throw handling after a no-misfire shot.

## JS changes

- `js/allmain.js`
  - Kept cursed/greased arrows eligible for the shared launcher-arrow landing path when they do not misfire.
  - Added the cursed/greased `!rn2(7)` preflight check after extracting the single thrown arrow.
  - Added zero-vector and redirected-away misfire landing through `landMonsterThrownObject(..., { ohit: false })`.
  - Preserved monster-turn resume state for both early misfire returns.

## Tests

- `production monster cursed launcher arrow zero-vector misfire drops at shooter` covers a cursed arrow that misfires with direction `(0, 0)`, lands at the shooter, does not damage the hero, and skips hit-only breakage RNG.
- `production monster greased launcher arrow redirected misfire lands away from hero` covers a greased arrow that misfires to a different vector, consumes the flight-path `rn2(5)` checks, lands away from the hero, and skips hit-only breakage RNG.
- `production monster cursed launcher arrow no-misfire still uses drop-throw landing` covers a cursed arrow where `rn2(7)` does not misfire, so the normal hit, damage, and shared drop-throw landing path still apply.

The seeds only drive deterministic source branches in the production code; no replay maps, move traces, or fixture-specific runtime shortcuts were added.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="launcher arrow" test/shop-billing-helpers.test.mjs` - 16 pass, 1493 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1509 pass
- `node --test test/*.mjs` - 1651 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Same-vector cursed/greased misfire fallthrough is source-understood but does not yet have a dedicated canary.
- Broader redirected flight through walls, doors, bars, and other obstacles remains outside this simplified production launcher-arrow path.
- Eroded, lethal, and broader blessed/enchanted launcher-arrow persistence still need separate C-backed slices.
