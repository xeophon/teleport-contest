# Monster Dwarvish Spear Iron Bars

Date: 2026-06-04

## Summary

Monster-thrown dwarvish spears now have focused production coverage on the existing spear path. C ranks `DWARVISH_SPEAR` before all other spear-family ranged weapons, gives it the unidentified description `stout spear`, treats it as an iron `P_SPEAR`, and uses d8 small-target damage. JS already routes metadata-bearing `dwarvish spear`/`stout spear` objects through the first spear rank and d8 damage table; this slice locks that behavior down against the production monster-turn path.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/include/objects.h:170` through `:191`: dwarvish spears are iron `P_SPEAR` weapons with description `stout spear`, weight 35, and d8 small/large damage.
- `nethack-c/upstream/src/weapon.c:498` through `:503`: `rwep[]` ranks `DWARVISH_SPEAR` before silver, elven, ordinary, orcish spears, javelins, arrows, crossbow bolts, daggers, knives, stones, and darts.
- `nethack-c/upstream/src/weapon.c:612` through `:665`: positive-skill spear weapons use `hands_obj` rather than a launcher in the generic ranged weapon loop.
- `nethack-c/upstream/src/mthrowu.c:260` through `:300`: hand-thrown monster missiles emit `throws <article> <object>`.
- `nethack-c/upstream/src/mthrowu.c:680` through `:798`: a successful hero hit calls `drop_throw(singleobj, hitu, u.ux, u.uy)`, while misses continue into ordinary flight handling.
- `nethack-c/upstream/src/mthrowu.c:798` through `:816`: ordinary flight checks consume `forcehit = !rn2(5)` before terrain barriers and end-of-path drops.
- `nethack-c/upstream/src/mthrowu.c:1447` through `:1467`: ordinary iron bar impact sound is `Clonk!` unless the hero is Deaf.
- `nethack-c/upstream/src/mthrowu.c:1497` through `:1520`: `P_SPEAR` weapons pass through iron bars unless `always_hit`/`forcehit` is set.
- `nethack-c/upstream/src/makemon.c:380` through `:392`: natural dwarves can receive `DWARVISH_SPEAR` via `mongets()`.

## JS Changes

- `js/allmain.js`
  - Adds `monsterThrownSpearKind()` so visible spear wording uses a single local name extraction helper.
  - Preserves the existing `stout spear`/`dwarvish spear` first-rank and d8 damage metadata.
  - Uses the helper result in visible throw/hit/miss text.
- `test/shop-billing-helpers.test.mjs`
  - Adds a dwarvish spear fixture helper with object type `10102`.
  - Adds focused production regressions for dwarvish spear d8 hit text/damage, forced iron-bars `Clonk!`, and C-ranked selection before ordinary spear.

## Tests

- `production monster spear hit uses spear damage and text`
- `production monster dwarvish spear hit uses stout spear damage and text`
- `production monster dwarvish spear aimed shot can clonk iron bars before hero`
- `production monster dwarvish spear selection precedes ordinary spear`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern 'production monster (spear|dwarvish spear)' test/shop-billing-helpers.test.mjs` - 9 pass, 1584 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1593 pass
- `node --test test/*.test.mjs` - 1737 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Natural `mongets(DWARVISH_SPEAR)` objects are usable when name metadata is present, but bare object-type recognition is intentionally left for a broader inventory/pickup-state parity slice; enabling bare `otyp` selection currently changes public monster decisions before the surrounding state is C-shaped.
- Broader object-registry metadata such as unidentified appearance, weight, and material consolidation remains separate.
- Silver, elven, orcish spear variants and javelins share the same `P_SPEAR` C path but still need focused production coverage before they should be claimed as covered.
- Broader `hits_bars()` object-class coverage remains open for shuriken, remaining arrows, harmless/flimsy objects, boulders/heavy iron balls, armor/tool/food gates, object breakage side effects, wakeup noise, and bar dissolution.
