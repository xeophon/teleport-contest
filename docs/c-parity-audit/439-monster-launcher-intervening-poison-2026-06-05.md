# Monster Launcher Intervening Poison

Date: 2026-06-05

## Summary

Monster-fired launcher arrows that hit an intervening monster now run the `ohitmon()` poisoned-projectile side effect. After a confirmed intervening hit, the target wakes, takes base projectile damage, and then poisoned poisonable ammo either applies the visible poison-resistance message without consuming poison RNG or rolls the C poison branch for extra damage. The projectile still follows the existing hit-drop/mulch path and keeps its poison state when it lands.

This is a source-backed production broadening only. It does not add replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: `m_throw()` checks the current flight square for `m_at()` and resolves `ohitmon()` before hero and terrain handling.
- `nethack-c/upstream/src/mthrowu.c:340` through `:357`: `ohitmon()` uses the accidental monster hit roll and stops the projectile on a confirmed hit.
- `nethack-c/upstream/src/mthrowu.c:373` through `:384`: hit damage is computed, the target is woken, and the base hit message is printed before poison side effects.
- `nethack-c/upstream/src/mthrowu.c:403` through `:417`: poisoned poisonable projectiles check monster poison resistance without consuming poison RNG, otherwise roll `rn2(30)` for deadly poison or `rnd(6)` for extra damage.
- `nethack-c/upstream/src/mthrowu.c:452` through `:494`: damage is applied after poison and the projectile then routes through hit drop or mulch cleanup.

## JS Changes

- `js/allmain.js`
  - Extends the shared launcher-arrow intervening hit helper used by normal aimed shots and redirected cursed/greased misfires.
  - Wakes the intervening target before hit message construction, matching `ohitmon()` ordering.
  - Applies poisoned poisonable ammo side effects after the base hit message and before final HP subtraction.
  - Emits the visible poison-resistance message without consuming `rn2(30)` or `rnd(6)`.
  - Preserves the existing `ohit` drop path so landed arrows retain `opoisoned`.
- `test/shop-billing-helpers.test.mjs`
  - Adds a non-resistant intervening-monster poisoned-arrow hit test that pins hit, base-damage, poison-roll, poison-damage, and hit-drop ordering.
  - Adds a poison-resistant visible intervening-monster hit test that pins the no-poison-RNG sequence and the resistance message.

## Tests

- `production monster poisoned launcher arrow intervening hit applies monster poison damage`
- `production monster poisoned launcher arrow intervening hit respects monster poison resistance`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "poisoned launcher arrow intervening hit" test/shop-billing-helpers.test.mjs` - 2 pass
- `node --test --test-name-pattern "launcher arrow.*intervening|poisoned launcher arrow intervening" test/shop-billing-helpers.test.mjs` - 4 pass
- `git diff --check` - pass
- `node --test test/shop-billing-helpers.test.mjs` - 1671 pass
- `node --test test/*.test.mjs` - 1822 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Intervening monster hits still use the current minimal monster-damage branch and do not perform full `xkilled()`/`mondied()` cleanup.
- Silver extra damage and searing feedback remain outside this slice because NetHack applies the bonus through `dmgval()`.
- Intervening monster blinding, egg, acid-venom, mimic-reveal, and broader passive side effects remain separate source-backed slices.
- Monster-vs-monster aimed shooter-level and artifact-launcher bonuses remain separate from hero-directed launcher shots.
