# Monster Potion Intervening Hit

Date: 2026-06-04

## Summary

Monster-thrown offensive potions now check occupied flight squares before the hero catch/self-hit branch. When another monster is in the path, the potion uses the C `ohitmon()` hit roll, applies `potionhit()` to that intervening monster as `POTHIT_OTHER_THROW`, consumes the thrown potion unit, and leaves any residual stack with the thrower.

Accidental monster hits use the existing non-hero potion effect path without treating the hero as at fault, so ordinary peaceful targets can be woken/paralyzed without becoming hostile just because another monster threw the potion.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: `m_throw()` advances the missile square, observes the object, checks `m_at()` and `ohitmon()` before testing `u_at()`.
- `nethack-c/upstream/src/mthrowu.c:340` through `:361`: `ohitmon()` computes `5 + find_mac(mtmp) + omon_adj(...)`, rolls `rnd(20)`, and for potion hits calls `potionhit(mtmp, otmp, POTHIT_OTHER_THROW)`.
- `nethack-c/upstream/src/mthrowu.c:688` through `:699`: only after no intervening monster hit does the hero path try unicorn gem catch, ordinary catch, and `potionhit(&gy.youmonst, ..., POTHIT_MONST_THROW)`.
- `nethack-c/upstream/src/potion.c:1623` through `:1927`: `potionhit()` treats `how <= POTHIT_HERO_THROW` as hero fault, handles non-hero potion effects, runs the vapor/identification tail, and always consumes the object with `obfree()`.
- `nethack-c/upstream/src/potion.c:1809` through `:1815`: paralysis potions apply `paralyze_monst(mon, rnd(25))` when the monster can move.

## JS Changes

- `js/allmain.js`
  - Adds an occupied-square scan to the monster offensive-potion throw path before the hero catch logic.
  - Uses a C-shaped accidental hit value of `5 + monster AC` against `rnd(20)` for potion interception.
  - On an intervening hit, emits the potion messages, stops the projectile before hero catch/self-hit, preserves `--More--` monster-turn handoff state, and avoids floor projectile landing.
- `js/cmd.js`
  - Exposes `heroThrownPotionHitMonster()` with a `yourFault` option.
  - Adds `monsterThrownPotionHitMonster()` so accidental monster-thrown hits run through the same potion effects without forcing peaceful targets hostile.
- `test/shop-billing-helpers.test.mjs`
  - Extends the monster-potion helper with optional intervening monsters.
  - Adds production coverage for a monster-thrown paralysis potion hitting an orc in the flight path before the hero catch branch.

## Tests

- `production monster potion hits intervening monster before hero catch`

## Verification

- `node --test --test-reporter=spec --test-name-pattern "production monster potion hits intervening monster before hero catch|production monster potion (catch|singleton|acid|confusion|paralysis|blindness|sleeping)|deferred monster potion self-hit" test/shop-billing-helpers.test.mjs` - 5 pass, 1646 skipped
- `node --check js/cmd.js`
- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` - 1651 pass
- `node --test test/*.test.mjs` - 1802 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining Gaps

- This is not a general `ohitmon()` extraction for all monster-thrown projectiles. Broader miss messaging, final-square drop behavior, `shade_miss()`, mimic reveal details, `omon_adj()` bonuses, archer target bonuses, and non-potion object damage remain separate direct-hit work.
- Accidental lethal potion attribution is still bounded by the current JS potion-hit helper behavior; acid/water kill attribution should be audited separately before broadening this path beyond the covered nonlethal paralysis case.
