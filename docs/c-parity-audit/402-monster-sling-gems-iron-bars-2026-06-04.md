# Monster Sling Gems Iron Bars

Date: 2026-06-04

## Summary

Monster sling shots now use C-shaped gem and gray-stone ammo selection instead of treating every `GEM_CLASS` item as an ordinary rock. C ranks flint, rock, uncursed loadstone, and luckstone before the special arbitrary-gem sling fallback; that fallback only runs for monsters which do not like gems and skips cursed loadstones. The same `GEM_CLASS` projectiles pass through iron bars unless non-adjacent flight rolls `forcehit = !rn2(5)`, in which case they sound `Clonk!` unless the hero is Deaf and land on the thrower-side square with `ohit=false`.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/weapon.c:498` through `:503`: monster ranged weapon priority ranks `FLINT`, `ROCK`, `LOADSTONE`, and `LUCKSTONE` before `DART`.
- `nethack-c/upstream/src/weapon.c:615` through `:625`: arbitrary `GEM_CLASS` sling ammo fallback runs just before darts, requires a sling, skips monsters that like gems, and excludes cursed loadstones.
- `nethack-c/upstream/src/weapon.c:657` through `:670`: explicit loadstone selection also skips cursed loadstones.
- `nethack-c/upstream/include/objects.h:1515` through `:1606`: gems, gray stones, flint, and rocks are `GEM_CLASS` sling ammo; flint uses d6 damage, while ordinary gems/stones/rocks use d3.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: `monshoot()` names the actual fired object with `shoots <article> <name>`.
- `nethack-c/upstream/src/mthrowu.c:680` through `:745`: hero delivery applies gem catch, ordinary catch, `dmgval()`, hit/miss text, and hit-only `drop_throw()`.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: non-adjacent missile flight consumes `forcehit = !rn2(5)` before terrain checks and stopped missiles use `drop_throw(..., 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:1447` through `:1467`: ordinary gem/stone bar hits sound `Clonk!` unless the hero is Deaf.
- `nethack-c/upstream/src/mthrowu.c:1497` through `:1525`: `hits_bars()` has no special `GEM_CLASS` stop case, so sling gems and stones pass unless forced.

## JS Changes

- `js/allmain.js`
  - Adds flint, loadstone, and luckstone object constants for monster sling selection.
  - Adds a C-ranked sling-ammo selector: flint, rock, uncursed loadstone, luckstone, then arbitrary `GEM_CLASS` only when `!likesGems`.
  - Replaces rock-only sling messages with object-specific names and keeps C catch wording as `You catch the ...!`.
  - Uses flint d6 damage and d3 for other covered sling gem/stone ammo.
  - Keeps sling gem/stone iron-bars pass-through and forced `Clonk!` landing on the existing production projectile path.
  - Stops consuming the final flight `rn2(5)` after a successful hero hit.
- `js/cmd.js`
  - Allows hit-only monster-thrown non-magic gem ammo to use the existing drop-throw mulch gate while still excluding luckstones, loadstones, touchstones, and magic stones.
- `test/shop-billing-helpers.test.mjs`
  - Parameterizes the production sling helper with missile, inventory, active-missile, and monster-data fixtures.
  - Adds focused canaries for ruby pass-through/forced bars, visible object-specific shot wording, rock/loadstone priority, cursed-loadstone skip, `likesGems` fallback blocking, and flint d6 damage.

## Tests

- `production monster sling ruby aimed shot can pass through iron bars before hero`
- `production monster sling ruby aimed shot can clonk iron bars before hero`
- `production monster sling rock selection precedes arbitrary gems`
- `production monster sling uncursed loadstone selection precedes arbitrary gems`
- `production monster sling skips cursed loadstone for arbitrary gem fallback`
- `production monsters that like gems do not use arbitrary sling gem fallback`
- `production monster sling flint uses flint damage against hero`

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern 'sling (rock|ruby|uncursed loadstone|skips cursed loadstone|gems do not use|flint)' test/shop-billing-helpers.test.mjs` - 11 pass, 1579 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1590 pass
- `node --test test/*.test.mjs` - 1734 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Unicorn-polyself gem catch remains modeled only through existing ordinary catch behavior in this path.
- Natural production and object-registry coverage for broader projectile classes remains separate: dwarvish spear is the next clean `hits_bars()` slice, while shuriken, heavy objects, harmless/flimsy objects, and remaining arrow variants need more metadata/generation work first.
