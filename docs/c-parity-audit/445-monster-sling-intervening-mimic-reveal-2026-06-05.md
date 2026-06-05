# Monster Sling Intervening Mimic Reveal

Date: 2026-06-05

## Summary

Monster-slung rocks and loadstones that hit an intervening object/furniture mimic now reveal the mimic before wakeup, hit messaging, damage application, and `drop_throw()`-style landing/stacking. The same slice pins that ordinary `mundetected` hiders remain concealed after a successful slung-rock hit, matching `ohitmon()` rather than the broader `wakeup()` force-fight path. The implementation is state-driven and does not depend on replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:335`: `ohitmon()` treats only `M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) != M_AP_MONSTER` as a disguised mimic for projectile reveal.
- `nethack-c/upstream/src/mthrowu.c:340` through `:350`: hit/miss resolution happens before reveal; misses against object/furniture mimics suppress miss messaging and do not call `seemimic()`.
- `nethack-c/upstream/src/mthrowu.c:373` through `:382`: non-potion projectile hits compute damage first, then reveal disguised mimics with `seemimic(mtmp)`, then clear `msleeping`.
- `nethack-c/upstream/src/mthrowu.c:384` through `:398`: visible hit messaging and harmless stone pass-through messaging happen after mimic reveal.
- `nethack-c/upstream/src/mthrowu.c:464` through `:496`: damage, death, anger, and `drop_throw(otmp, 1, ...)` happen after mimic reveal and wakeup.
- `nethack-c/upstream/src/mthrowu.c:673` through `:686`: monster projectile flight advances square-by-square, finds intervening monsters with `m_at()`, and calls `ohitmon(mtmp, singleobj, range, TRUE)`.
- `nethack-c/upstream/src/mon.c:4409` through `:4426`: `seemimic()` clears mimic appearance state and redraws the square with `newsym()`.
- `nethack-c/upstream/src/mon.c:4333` through `:4345`: the broader `wakeup()` helper only clears `mundetected` in a separate force-fight path; `ohitmon()` itself does not unhide ordinary `mundetected` monsters.

## JS Changes

- `js/allmain.js`
  - Calls `revealProjectileHitMimicAppearance()` in the monster-slung intervening-hit path after slung-ammo damage is rolled and before sleep clearing, hit messaging, harmless pass-through handling, and `landMonsterThrownObject(..., ohit: true)`.
- `test/shop-billing-helpers.test.mjs`
  - Adds slung-rock object-mimic and slung-loadstone furniture-mimic coverage that asserts the intervening hit clears `m_ap_type`/appearance fields, wakes/damages the mimic, preserves the no-hero-damage path, and lands the projectile at the hit square.
  - Adds ordinary hidden-target coverage that asserts `mundetected` remains set after the slung-rock hit while `msleeping` clears.

## Tests

- `production monster sling rock reveals object mimic on intervening hit`
- `production monster sling loadstone reveals furniture mimic on intervening hit`
- `production monster sling rock leaves ordinary hidden intervening target concealed`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern="sling (rock|loadstone) (hits intervening|reveals object mimic|reveals furniture mimic|leaves ordinary hidden|hit on intervening|sleeping target|loadstone intervening|harmless rock-passer|glass gem still harms)" test/shop-billing-helpers.test.mjs` - 5 pass, 1681 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1686 pass
- `node --test test/*.mjs` - 1837 pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Non-potion thrown-object mimic reveal remains separate for dagger, spear, shuriken, knife, dart, and related non-sling branches.
- Broader slung-gem object/furniture mimic reveal is covered by the shared sling branch but still needs direct non-loadstone gem fixture rows if future hidden tests expose display or harmless-pass-specific gaps.
- Hidden-target slung-hit naming remains a separate display/naming slice.
- Intervening monster blinding, egg, acid-venom, and broader passive side effects remain separate source-backed slices.
