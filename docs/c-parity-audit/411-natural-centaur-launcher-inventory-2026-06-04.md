# Natural Centaur Launcher Inventory

Date: 2026-06-04

## Summary

Natural centaur inventory generation now follows the C `S_CENTAUR` split for launcher gear. Forest centaurs keep the bow plus arrow branch, while plains and mountain centaurs now receive crossbows plus crossbow bolts when the same launcher branch fires. The ammo stack still uses the shared `m_initthrow()` quantity range of `rn2(12) + 3`, and no replay, seed, map, player-name, move-count, or trace-conditioned behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/makemon.c:147` through `:158`: `m_initthrow()` creates the object with `mksobj(..., TRUE, FALSE)`, overwrites quantity with `rn1(oquan, 3)`, recomputes weight, and only force-poisons `ORCISH_ARROW`.
- `nethack-c/upstream/src/makemon.c:474` through `:483`: `S_CENTAUR` rolls `rn2(2)`; forest centaurs get `BOW` plus `ARROW`, while all other centaurs get `CROSSBOW` plus `CROSSBOW_BOLT`.
- `nethack-c/upstream/include/monsters.h:1301` through `:1323`: plains, forest, and mountain centaur monster rows.
- `nethack-c/upstream/include/objects.h:141` through `:157`: ordinary arrows and crossbow bolts are iron projectiles for bow and crossbow skills.
- `nethack-c/upstream/include/objects.h:395` through `:406`: bows and crossbows are wood launchers.

## JS Changes

- `js/mklev.js`
  - Keeps forest centaur launcher inventory as `BOW` plus `ARROW`.
  - Routes plains and mountain centaur launcher inventory to `CROSSBOW` plus `CROSSBOW_BOLT`.
  - Reuses existing object metadata and the existing `m_initthrow()` stack handling.
- `test/mklev-themerooms.test.mjs`
  - Adds a production `makemon()` test that searches for the natural launcher branch on all three centaur species and asserts the C launcher/ammo split.

## Tests

- `natural centaurs split forest bow ammo from crossbow bolts`

## Verification

- `node --check js/mklev.js`
- `node --check test/mklev-themerooms.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "natural centaurs" test/mklev-themerooms.test.mjs` - 1 pass, 48 skipped
- `node --test test/mklev-themerooms.test.mjs` - 49 pass
- `node --test test/shop-billing-helpers.test.mjs` - 1614 pass
- `node --test test/*.test.mjs` - 1762 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Natural kobold dart generation is already structurally present but still needs a source-backed regression slice across kobold variants.
- Keystone Kop cream-pie and club/rubber-hose inventory generation remains open.
- Runtime launcher selection and broader monster projectile handling remain only partially modeled.
