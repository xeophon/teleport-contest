# Monster Thrown Blessed Intervening Damage

Date: 2026-06-05

## Summary

Monster-fired launcher arrows and monster-thrown non-potion weapons now apply the C `dmgval()` blessed-object bonus when they hit a blessing-hating intervening monster. After the confirmed intervening hit, blessed projectiles add `rnd(4)` damage before mimic reveal, wakeup, hit-message punctuation, poison/silver follow-ups, death/drop handling, and hit-square landing. The implementation is state-driven and does not depend on replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:673` through `:686`: `m_throw()` walks flight squares, checks intervening monsters with `m_at()`, and calls `ohitmon(mtmp, singleobj, range, TRUE)`.
- `nethack-c/upstream/src/mthrowu.c:373` through `:382`: ordinary non-potion intervening hits call `dmgval(otmp, mtmp)` before mimic reveal and `mtmp->msleeping = 0`.
- `nethack-c/upstream/src/weapon.c:216` through `:360`: `dmgval()` computes object damage, applies weapon enchantment, then adds special bonuses before erosion reduction.
- `nethack-c/upstream/src/weapon.c:322` through `:328`: for weapons, gems, balls, and chains, blessed objects add `rnd(4)` damage when `mon_hates_blessings()` is true.
- `nethack-c/upstream/src/weapon.c:157` through `:164`: the same blessed predicate contributes `+2` to weapon hit value; the JS already modeled this in accidental-hit value and this slice adds the missing damage side.
- `nethack-c/upstream/src/mondata.c:533` through `:542`: `mon_hates_blessings()` covers vampshifters and monster types for which `hates_blessings()` is true; `hates_blessings()` is undead or demon.

## JS Changes

- `js/allmain.js`
  - Adds `monsterThrownObjectBlessedHitDamage()` and a C-shaped object-class gate for `dmgval()` blessed bonus eligibility.
  - Wires the blessed `rnd(4)` damage roll into launcher-arrow intervening hits before silver/poison/death handling.
  - Wires the same helper into existing non-potion monster-thrown intervening-hit branches for spear, shuriken, plain/silver dagger, crude/orcish dagger, knife, and dart.
- `test/shop-billing-helpers.test.mjs`
  - Adds a blessed launcher-arrow intervening-hit fixture against a visible human zombie.
  - Adds a table-driven blessed thrown-weapon intervening-hit fixture for spear and dagger against a visible human zombie.
  - Asserts blessed damage ordering, HP accounting, no hero damage, no iron-bars stop, hit-square landing, and monster inventory consumption.

## Tests

- `production monster blessed launcher arrow intervening hit damages blessing-hating monster`
- `production monster thrown blessed weapons damage blessing-hating intervening monsters`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "blessed launcher arrow intervening|thrown blessed weapons|thrown silver weapons sear|silver launcher arrow intervening hit" test/shop-billing-helpers.test.mjs` - 6 pass, 1685 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1691 pass
- `node --test test/*.mjs` - 1842 pass
- `git diff --check` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Poisoned thrown-weapon side effects, acid venom, eggs, blinding venom, and cream-pie post-hit effects remain separate `ohitmon()` slices.
- Full monster death cleanup for non-launcher thrown intervening hits remains narrower than `xkilled()`/`mondied()` and should stay source-backed.
- The helper is C-shaped for blessed weapons, gems, balls, and chains, but this slice only wires launcher arrows and the existing thrown non-potion weapon branches.
