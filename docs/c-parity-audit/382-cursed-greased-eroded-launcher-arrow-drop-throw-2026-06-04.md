# Cursed Greased Eroded Launcher Arrow Drop-Throw

Date: 2026-06-04

## Summary

Routed cursed and greased eroded monster-fired launcher arrows through the shared C-shaped `drop_throw()` path after the preflight no-misfire check. This removes the local JS restriction that treated curse and grease as reasons to keep eroded arrows on the legacy deferred mulch shim. C only uses curse or grease for the initial `rn2(7)` misfire gate; after that, ordinary flight, erosion-adjusted damage, hit-only mulch, blessed survival, and deletion resistance are the same `drop_throw()` flow as other arrows.

This audit also adds a same-vector cursed misfire canary. C special-cases only the zero vector after a misfire direction reroll; if the rerolled vector matches the original vector, the arrow continues normal flight.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:603` through `:616`: `m_throw()` extracts or splits one projectile, preserving BUC, grease, enchantment, and erosion fields.
- `nethack-c/upstream/src/mthrowu.c:622` through `:637`: cursed/greased projectiles consume one `rn2(7)` preflight roll; on misfire they consume `rn2(3)` for `dx` and `rn2(3)` for `dy`; only `(0,0)` immediately calls `drop_throw(..., 0, shooter_x, shooter_y)`.
- `nethack-c/upstream/src/mthrowu.c:639` through `:642`: nonzero rerolled directions, including same-vector misfires, continue into ordinary flight checks.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: hero-contact damage is computed with `dmgval(singleobj, &gy.youmonst)` before the hit roll.
- `nethack-c/upstream/src/mthrowu.c:787` through `:789`: nonlethal hero hits call `drop_throw(singleobj, hitu, u.ux, u.uy)`.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: misses and end-of-flight landings call `drop_throw(singleobj, 0, ...)`.
- `nethack-c/upstream/src/weapon.c:344` through `:352` and `nethack-c/upstream/include/obj.h:126`: `dmgval()` subtracts `greatest_erosion()` and clamps positive damage to at least 1.
- `nethack-c/upstream/src/dothrow.c:1976` through `:1993`: `should_mulch_missile()` uses `chance = 3 + greatest_erosion(obj) - obj->spe`; curse and grease do not affect this later roll.
- `nethack-c/upstream/src/zap.c:1469`: mulched ordinary arrows still consume deletion-resistance `rn2(100)`.

## JS changes

- `js/allmain.js`
  - Removes the `!thrownMissile.cursed && !thrownMissile.greased` exclusion from the eroded-arrow sharing gate.
  - Keeps the existing blessed enchanted-eroded guard: blessed eroded arrows still need `spe === 0` before using the shared path.
  - Leaves the existing preflight cursed/greased `rn2(7)` misfire routing in place.
- `js/cmd.js`
  - No code change needed; `landMonsterThrownObject()` already models hit-only `should_mulch_missile()` with erosion, enchantment, blessed survival, passive-object handling, and deletion resistance.

## Tests

- `production monster cursed eroded launcher arrow no-misfire uses erosion mulch` covers a cursed eroded no-misfire hit that lands after the C `rn2(4)` erosion mulch gate.
- `production monster greased eroded launcher arrow no-misfire uses drop-throw landing` covers the same no-misfire path for grease, preserving `greased` and `oeroded` on the landed arrow.
- `production monster blessed greased eroded launcher arrow no-misfire keeps blessed roll` covers grease plus blessed `+0` erosion, including the post-mulch blessed survival `rn2(3)` roll.
- `production monster cursed launcher arrow same-vector misfire continues normal flight` covers a nonzero same-vector misfire direction and verifies that normal flight still reaches damage and hit-roll RNG.

The deterministic seeds only choose branches inside the existing unit harness. No replay-map checks, move-trace shortcuts, or seed-conditioned production behavior were added.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "cursed eroded launcher arrow|greased eroded launcher arrow|blessed greased eroded launcher arrow|same-vector misfire|cursed launcher arrow no-misfire|greased launcher arrow" test/shop-billing-helpers.test.mjs` - 6 pass, 1524 skipped
- `node --test --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` - 28 pass, 1502 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1530 pass
- `node --test test/*.mjs` - 1673 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Blessed enchanted-eroded launcher arrows (`+1` and `+2`) should be routed through `drop_throw()` in a separate slice.
- Clean blessed `+1` and `+2` launcher arrows are still excluded from shared landing despite the helper already having the C-shaped blessed survival/deletion behavior.
- Greased same-vector and eroded same-vector canaries can be added later; C treats cursed and greased through the same OR gate, but the current same-vector test only uses a cursed arrow.
- Lethal launcher-arrow persistence and obstacle/end-of-flight landing remain separate projectile slices.
