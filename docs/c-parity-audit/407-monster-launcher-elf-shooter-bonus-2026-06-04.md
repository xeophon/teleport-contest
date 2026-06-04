# Monster Launcher Elf Shooter Bonus

Date: 2026-06-04

## Summary

Monster-fired bow ammo now applies the upstream elf shooter adjustments in the production launcher hit path. Elf shooters get `+1` hit value with bow ammo, a second `+1` when wielding an elven bow, and `+1` damage when the projectile is an elven/`runed` arrow. The adjustment consumes no RNG and keeps the existing damage-roll-then-hit-roll ordering.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/include/mondata.h:97`: `is_elf(ptr)` checks the monster `M2_ELF` flag.
- `nethack-c/upstream/include/objects.h:140` through `:154`: arrows, elven/`runed` arrows, orcish/`crude` arrows, silver arrows, and `ya` all use bow-ammo skill `-P_BOW`; crossbow bolts use a separate crossbow skill.
- `nethack-c/upstream/include/objects.h:397` through `:398`: `ELVEN_BOW` has the `runed bow` appearance.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: monster projectile hits compute `dam = dmgval(...)`, derive range hit value, apply elf shooter bonuses for bow ammo, then call `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:727` through `:733`: elf shooters get `hitv++` for bow ammo, another `hitv++` with an elven bow, and `dam++` for elven arrows.
- `nethack-c/upstream/src/weapon.c:263` through `:276`: `dmgval()` supplies the base damage roll before the elf elven-arrow damage increment.

## JS Changes

- `js/allmain.js`
  - Adds metadata predicates for bow ammo, elven arrows, elven bows, and elf monsters.
  - Applies the C elf shooter hit/damage adjustments only in the production monster launcher hit path.
  - Leaves multishot, natural elf inventory generation, and poison side effects as separate slices.
- `test/shop-billing-helpers.test.mjs`
  - Extends the launcher-arrow helper so tests can set monster and launcher metadata.
  - Adds focused threshold tests for the elf bow-ammo hit bonus and elven-bow second hit bonus.
  - Adds a focused damage test proving the elven-arrow `+1` damage increment without consuming extra RNG.

## Tests

- `production elf launcher arrow hit uses bow-ammo accuracy bonus`
- `production elf with elven bow gets second launcher accuracy bonus`
- `production elf launcher runed arrow gets elven arrow damage bonus`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern 'production (elf launcher arrow hit uses bow-ammo accuracy bonus|elf with elven bow gets second launcher accuracy bonus|elf launcher runed arrow gets elven arrow damage bonus|monster runed launcher arrow hit uses elven arrow damage from appearance|monster launcher arrow miss lands)' test/shop-billing-helpers.test.mjs` - 5 pass, 1607 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1612 pass
- `node --test test/*.test.mjs` - 1756 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- True C launcher multishot volleys remain incomplete; current JS still resolves one projectile per launcher turn.
- Orcish-arrow poison, natural racial bow/ammo generation, racial launcher selection, and launcher-specific bow metadata remain separate.
- Big-monster hero target hit adjustment, physical damage halving, and broader monster projectile object lifecycle side effects remain separate.
