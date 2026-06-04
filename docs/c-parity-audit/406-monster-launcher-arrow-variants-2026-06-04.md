# Monster Launcher Arrow Variants

Date: 2026-06-04

## Summary

Monster-fired bow-ammo variants now use C small-target damage dice in the production launcher path when the projectile carries explicit metadata. Ordinary arrows and silver arrows remain d6, `ya`/`bamboo arrow` and elven/`runed arrow` use d7, and orcish/`crude arrow` uses d5. The launcher ammo selector and projectile naming now also recognize `appearance` metadata, so unidentified bow ammo descriptions can take the same production route without inventing local object-type constants.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/include/objects.h:140` through `:154`: bow ammo definitions give ordinary arrows d6, elven arrows/`runed arrow` d7, orcish arrows/`crude arrow` d5, silver arrows d6, and `ya`/`bamboo arrow` d7.
- `nethack-c/upstream/src/weapon.c:263` through `:276`: `dmgval()` uses `rnd(objects[otyp].oc_wsdam)` for small targets; `CROSSBOW_BOLT` gets the separate `+1` damage case, but bow ammo variants do not.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: monster projectile hits against the hero use `dmgval(singleobj, &gy.youmonst)`, then build hit value from range, elf shooter adjustments, big-target adjustment, `8`, and enchantment.
- `nethack-c/upstream/src/weapon.c:149` through `:159`: `hitval()` is where object `oc_hitbon` is applied, but the monster-to-hero projectile path above does not call it.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: `monshoot()` names and fires the projectile selected by `select_rwep()`.
- `nethack-c/upstream/src/mthrowu.c:787` through `:816`: hit and miss landing still use the shared `drop_throw()`/flight path after damage and hit resolution.

## JS Changes

- `js/allmain.js`
  - Adds metadata-based launcher projectile helpers for display name, damage die, and crossbow-bolt damage bonus.
  - Uses `appearance` metadata when detecting active launcher ammo, so `runed arrow`, `crude arrow`, and `bamboo arrow` can be recognized when actual object ids are not modeled.
  - Changes production launcher hit damage from "all non-crossbow ammo uses d6" to C dice for metadata-bearing bow ammo variants.
  - Leaves hit value unchanged; YA's C `oc_hitbon` is intentionally not applied to monster-to-hero projectile hit rolls.
- `test/shop-billing-helpers.test.mjs`
  - Adds focused production hit canaries for `ya`, appearance-only `runed arrow`, appearance-only `crude arrow`, and direct-hit `silver arrow` metadata.

## Tests

- `production monster ya launcher arrow hit uses YA d7 damage`
- `production monster runed launcher arrow hit uses elven arrow damage from appearance`
- `production monster crude launcher arrow hit uses orcish arrow damage from appearance`
- `production monster silver launcher arrow direct hit keeps silver arrow d6 damage`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern 'production monster (ya|runed launcher arrow|crude launcher arrow|silver launcher arrow direct hit|crossbow bolt hit|launcher arrow hit lands)' test/shop-billing-helpers.test.mjs` - 6 pass, 1603 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1609 pass
- `node --test test/*.test.mjs` - 1753 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Natural monster generation still gives several monsters ordinary arrows where C would generate elven, orcish, or ya ammo; this slice only covers metadata-bearing production shots.
- Orcish-arrow poison, elf shooter hit/damage bonuses, racial launcher selection, multishot, and launcher-specific bow metadata remain separate.
- Bare object-type constants and registry-backed bow ammo metadata remain future work.
- Broader launcher projectile behavior remains narrower than C for polymorphed hero size, resistance modifiers, and complete object lifecycle side effects.
