# Monster Potion Intervening Mimic Reveal

Date: 2026-06-05

## Summary

Monster-thrown potions that hit an intervening object/furniture mimic now reveal the mimic before potion crash messaging and `potionhit()` side effects. The same slice pins the C nuance that ordinary `mundetected` hiders are not unhidden by `ohitmon()`; they can be hit and woken by the potion path while remaining concealed. The implementation is state-driven and does not depend on replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:335`: `ohitmon()` treats only `M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) != M_AP_MONSTER` as a disguised mimic for projectile reveal.
- `nethack-c/upstream/src/mthrowu.c:340` through `:350`: hit/miss resolution happens before reveal; misses against object/furniture mimics suppress miss messaging and do not call `seemimic()`.
- `nethack-c/upstream/src/mthrowu.c:361` through `:366`: potion-class hits reveal disguised mimics with `seemimic(mtmp)`, then clear `msleeping`, then call `potionhit(mtmp, otmp, POTHIT_OTHER_THROW)`.
- `nethack-c/upstream/src/mthrowu.c:673` through `:686`: monster projectile flight advances square-by-square, finds intervening monsters with `m_at()`, and calls `ohitmon(mtmp, singleobj, range, TRUE)`.
- `nethack-c/upstream/src/mon.c:4409` through `:4426`: `seemimic()` clears mimic appearance state and redraws the square with `newsym()`.
- `nethack-c/upstream/src/mon.c:4333` through `:4345`: the broader `wakeup()` helper only clears `mundetected` in a separate force-fight path; `ohitmon()` itself does not unhide ordinary `mundetected` monsters.

## JS Changes

- `js/allmain.js`
  - Calls `revealProjectileHitMimicAppearance()` in the monster-thrown potion intervening-hit path after the C-shaped hit roll succeeds and before `monsterThrownPotionHitMonster()` runs potion crash messaging and side effects.
- `test/shop-billing-helpers.test.mjs`
  - Adds object-mimic and furniture-mimic coverage that asserts the intervening potion hit clears `m_ap_type`/appearance fields, wakes/paralyzes the mimic through potion effects, consumes the thrown potion, and preserves stack residual handling.
  - Adds ordinary hidden-target coverage that asserts `mundetected` remains set after the potion hit while `msleeping` clears.

## Tests

- `production monster potion reveals object mimic on intervening hit`
- `production monster potion reveals furniture mimic on intervening hit`
- `production monster potion leaves ordinary hidden intervening target concealed`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern="monster potion (hits intervening|reveals object mimic|reveals furniture mimic|leaves ordinary hidden|acid potion kills intervening)" test/shop-billing-helpers.test.mjs` - 4 pass, 1679 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1683 pass
- `node --test test/*.mjs` - 1834 pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Non-potion thrown-object mimic reveal remains a separate `ohitmon()` slice for the sling, dagger, spear, shuriken, knife, dart, and related paths.
- Potion miss behavior for disguised mimics remains separate from this successful-hit slice.
- Hidden-target potion crash naming remains a separate display/naming slice.
- Intervening monster blinding, egg, acid-venom, and broader passive side effects remain separate source-backed slices.
- Monster-vs-monster aimed shooter-level and artifact-launcher bonuses remain separate from hero-directed projectile shots.
