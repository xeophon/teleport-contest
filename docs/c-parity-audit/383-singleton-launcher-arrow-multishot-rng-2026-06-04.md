# Singleton Launcher Arrow Multishot RNG

Date: 2026-06-04

## Summary

Aligned monster-fired singleton launcher arrows with C `monmulti()` RNG ordering. C only randomizes a monster volley count when the projectile stack has more than one item. A single arrow has no possible multishot and does not consume the `rnd(multishot)` call. The JS launcher-arrow path was consuming `rnd(1)` unconditionally, shifting every subsequent flight, damage, hit, mulch, and misfire branch for singleton arrows.

Stacked arrows still consume the capped `rnd(1)` multishot roll in the covered gnome/bow/arrow harness, then consume `rnd(2)` through `next_ident()` when one projectile is split out of the stack.

## Upstream source anchors

- `nethack-c/upstream/src/mthrowu.c:201` through `:238`: `monmulti()` wraps its multishot randomization in `if (otmp->quan > 1L)`, so singleton ammunition skips the `rnd(multishot)` call entirely.
- `nethack-c/upstream/src/mthrowu.c:611` through `:614`: stack shots split a single projectile from the stack after multishot selection.
- `nethack-c/upstream/src/mkobj.c:509` through `:515`: `next_ident()` advances object identity with `rnd(2)` when split stack projectiles receive a fresh id.
- `js/mklev.js:3922` through `:3925`: the JS `next_ident()` helper already models that `rnd(2)` advancement.

## JS changes

- `js/allmain.js`
  - Guards the launcher-arrow `rnd(1)` multishot roll with `(missile.quan || 1) > 1`.
  - Leaves the existing stack split and `next_ident()` path unchanged.

No replay seed, map, player-name, or trace-conditioned behavior was added.

## Tests

- Existing singleton launcher-arrow hit, miss, blessed, cursed, greased, eroded, and enchanted canaries were reseeded to account for the removed `rnd(1)` and now assert that singleton shots do not consume `rnd(1)`.
- Existing stack canaries now assert that a stacked launcher-arrow shot still consumes `rnd(1)` before the split projectile's `rnd(2)` identity roll.
- The branch tests continue to cover the already-audited shared `drop_throw()` landing states; only branch-selection seeds and RNG expectations changed.

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "launcher arrow" test/shop-billing-helpers.test.mjs` - 28 pass, 1502 skipped
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` - 1530 pass
- `node --test test/*.mjs` - 1673 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Clean blessed `+1` and `+2` launcher arrows plus blessed enchanted-eroded launcher arrows still need a separate `drop_throw()` routing slice.
- Greased/eroded same-vector canaries, obstacle/end-of-flight landing, and lethal launcher-arrow persistence remain separate projectile slices.
