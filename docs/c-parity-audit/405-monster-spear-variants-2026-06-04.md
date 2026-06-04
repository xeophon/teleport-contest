# Monster Spear Variants

Date: 2026-06-04

## Summary

Monster-thrown spear-family variant metadata is now covered in the production ranged-weapon path. C ranks `DWARVISH_SPEAR`, `SILVER_SPEAR`, `ELVEN_SPEAR`, ordinary `SPEAR`, `ORCISH_SPEAR`, and `JAVELIN` before shuriken and launcher ammo; all of them use `P_SPEAR`, so they pass through iron bars unless the per-square `forcehit = !rn2(5)` roll forces impact. Silver spears use the ordinary spear d6 damage die but make silver `Clink!` impact sound on forced iron-bars hits. Elven, orcish, and javelin unidentified descriptions are now recognized from object `appearance` metadata, so `runed spear`, `crude spear`, and `throwing spear` objects select, name, and damage like their C counterparts.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/include/objects.h:170` through `:190`: spear-family object metadata gives elven spears description `runed spear`, wood material, and d7 small damage; orcish spears description `crude spear`, iron material, and d5 small damage; silver spears silver material and d6 small damage; javelins description `throwing spear`, iron material, and d6 small damage.
- `nethack-c/upstream/src/weapon.c:498` through `:503`: `rwep[]` ranks `DWARVISH_SPEAR`, `SILVER_SPEAR`, `ELVEN_SPEAR`, `SPEAR`, `ORCISH_SPEAR`, and `JAVELIN` before `SHURIKEN`, arrows, crossbow bolts, daggers, knives, stones, and darts.
- `nethack-c/upstream/src/weapon.c:612` through `:665`: positive-skill spear-family weapons use `hands_obj` and are thrown directly by monsters.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: `monshoot()` emits `throws <article> <object>` for hand-thrown missiles and routes through `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:593` through `:616`: `m_throw()` extracts a single inventory object before flight, preserving object metadata.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: hero hit damage uses `dmgval()`, range-adjusted hit value, enchantment, and a floor of one damage.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: non-adjacent missile flight consumes `forcehit = !rn2(5)` before checking next-square terrain, and stopped missiles use `drop_throw(..., 0, ...)`.
- `nethack-c/upstream/src/mthrowu.c:1447` through `:1467`: bar impact wording uses `Clink!` for silver/gold material and `Clonk!` for ordinary non-flimsy iron/wood missiles, unless the hero is Deaf.
- `nethack-c/upstream/src/mthrowu.c:1512` through `:1520`: `P_SPEAR` weapons pass through iron bars unless `always_hit`/`forcehit` is set.

## JS Changes

- `js/allmain.js`
  - Extends spear-family display/selection metadata to include `appearance`, matching unidentified C descriptions for elven spears, orcish spears, and javelins.
  - Keeps existing C-ranked spear-family ordering and damage tables active for appearance-only metadata-bearing objects.
  - Preserves silver spear `Clink!` and other spear-family `Clonk!` forced iron-bars behavior in the production monster throw path.
- `test/shop-billing-helpers.test.mjs`
  - Adds a metadata-only spear variant fixture helper without introducing local object-type constants for the unmodeled variants.
  - Adds focused production canaries for silver spear iron-bars `Clink!`, runed spear d7 damage from appearance, crude spear d5 damage from appearance, silver-before-elven/ordinary rank, and orcish-before-javelin/shuriken rank.

## Tests

- `production monster silver spear aimed shot can clink iron bars before hero`
- `production monster runed spear hit uses elven spear damage from appearance`
- `production monster crude spear hit uses orcish spear damage from appearance`
- `production monster silver and elven spear selection follows C ranged order`
- `production monster orcish spear selection precedes throwing spear and shuriken`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern 'production monster (spear|dwarvish spear|silver spear|runed spear|crude spear|orcish spear)' test/shop-billing-helpers.test.mjs` - 14 pass, 1591 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1605 pass
- `node --test test/*.test.mjs` - 1749 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Natural `mongets()`/`m_initweap()` generation of silver, elven, orcish spear, and javelin objects remains separate from this metadata-bearing production throw slice.
- Bare object-type constants and consolidated object-registry metadata for these variants remain future work; this slice intentionally avoids local fake `otyp` values for unmodeled variants.
- Silver-hating monster selection constraints, wielded/welded weapon refusal, full multishot, and broader monster ranged weapon selection are still narrower than C.
- Broader `hits_bars()` object-class coverage remains open for remaining arrows, harmless/flimsy objects, boulders/heavy iron balls, armor/tool/food gates, object breakage side effects, wakeup noise, and bar dissolution.
