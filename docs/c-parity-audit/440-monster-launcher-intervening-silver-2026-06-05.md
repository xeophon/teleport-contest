# Monster Launcher Intervening Silver

Date: 2026-06-05

## Summary

Monster-fired silver launcher arrows that hit an intervening monster now run the `dmgval()` silver-hater bonus path. After a confirmed intervening hit, silver arrows add `rnd(20)` damage against silver-hating monsters before hit-message punctuation, then print the searing message after poison side effects and before HP subtraction. The shared normal-shot and redirected cursed/greased misfire intervening-hit helper keeps the existing hit-drop or mulch path.

This is a source-backed production broadening only. It does not add replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: `m_throw()` checks each projectile flight square for an intervening monster and resolves `ohitmon()` before hero and terrain handling.
- `nethack-c/upstream/src/mthrowu.c:340` through `:357`: `ohitmon()` uses the accidental monster hit roll and stops the projectile on a confirmed hit.
- `nethack-c/upstream/src/mthrowu.c:373` through `:384`: `dmgval()` computes hit damage before the visible hit message and before poison or silver feedback.
- `nethack-c/upstream/src/weapon.c:263` through `:331`: silver weapons add `rnd(20)` damage when `mon_hates_silver()` is true.
- `nethack-c/upstream/src/mondata.c:517` through `:524`: `mon_hates_silver()` covers were/vampire/demon/shade and imp-class monsters except tengu.
- `nethack-c/upstream/src/mthrowu.c:403` through `:423`: poison feedback precedes silver searing feedback, including the flesh/non-flesh wording.
- `nethack-c/upstream/src/mthrowu.c:452` through `:494`: final damage is applied after silver feedback and the projectile routes through hit drop or mulch cleanup.

## JS Changes

- `js/allmain.js`
  - Adds silver-projectile detection for launcher-arrow intervening hits using object material or silver-arrow names.
  - Adds a compact silver-hater predicate matching the covered `mon_hates_silver()` monster groups, including the tengu exception for imp-class monsters.
  - Adds `rnd(20)` silver damage before hit-message punctuation and queues the visible or unseen searing message after poison side effects.
  - Keeps the existing shared hit-drop/mulch behavior for both normal aimed launcher arrows and redirected cursed/greased launcher-arrow misfires.
- `test/shop-billing-helpers.test.mjs`
  - Adds a vampire intervening-hit test that pins base damage, silver damage, searing feedback, mulch ordering, and no hero damage.
  - Adds a tengu intervening-hit test that pins the imp-class exception, no silver RNG, no searing feedback, and normal hit-drop landing.

## Tests

- `production monster silver launcher arrow intervening hit sears silver hater`
- `production monster silver launcher arrow intervening hit excludes tengu from imp silver searing`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "silver launcher arrow intervening hit" test/shop-billing-helpers.test.mjs` - 2 pass
- `node --test --test-name-pattern "launcher arrow.*intervening|poisoned launcher arrow intervening|silver launcher arrow intervening" test/shop-billing-helpers.test.mjs` - 6 pass
- `git diff --check` - pass
- `node --test test/shop-billing-helpers.test.mjs` - 1673 pass
- `node --test test/*.test.mjs` - 1824 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Intervening monster hits still use the current minimal monster-damage branch and do not perform full `xkilled()`/`mondied()` cleanup.
- Intervening monster blinding, egg, acid-venom, mimic-reveal, and broader passive side effects remain separate source-backed slices.
- Monster-vs-monster aimed shooter-level and artifact-launcher bonuses remain separate from hero-directed launcher shots.
- Broader silver-weapon coverage outside launcher-arrow intervening hits remains separate from this slice.
