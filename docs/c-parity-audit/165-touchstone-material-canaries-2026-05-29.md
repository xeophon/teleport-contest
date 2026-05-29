# Touchstone Material Canaries 2026-05-29

Implemented the next `use_stone()` material-effect slice after a fresh subagent audit round. No private fixtures were inspected.

## C Anchors

- `use_stone()` keys material effects from `objects[obj->otyp].oc_material`, not display names: `nethack-c/upstream/src/apply.c:2763`.
- `LIQUID` is the wetstone branch and is used by venom objects, while potions are `GLASS`: `nethack-c/upstream/src/apply.c:2767`, `nethack-c/upstream/include/objects.h:1121`, `nethack-c/upstream/include/objects.h:1638`.
- `is_flimsy()` objects leave color streaks instead of scratching both touchstones and non-touchstones: `nethack-c/upstream/src/apply.c:2788`, `nethack-c/upstream/include/obj.h:418`.
- Object colors are reported through `c_obj_colors[]`: `nethack-c/upstream/src/apply.c:2752`, `nethack-c/upstream/src/decl.c:20`.
- Non-obvious material canaries include cloth sacks/blindfolds, wax tallow candles, wood magic instruments/chests, the gold Candelabrum, and the silver Bell of Opening: `nethack-c/upstream/include/objects.h:905`, `nethack-c/upstream/include/objects.h:923`, `nethack-c/upstream/include/objects.h:981`, `nethack-c/upstream/include/objects.h:1021`.

## JS Work

- Added local `use_stone()` material/color profiles in `js/cmd.js` for flimsy materials, source-backed object ids, and kind aliases.
- Corrected potions to behave as `GLASS` rather than `LIQUID`; water potions on touchstones now fall through to `"scritch, scritch"`.
- Added venom as the actual `LIQUID` wetstone target and matched C's `!obj->known` check.
- Added the `is_flimsy()` streak fallback so paper/leather/organic/rubber targets can leave color streaks rather than incorrectly scratching or falling to generic scritch.
- Added canary rows for paper, potion glass, liquid venom, cloth, wax, silver, and gold material handling.

## Public Tests

Added focused tests in `test/shop-billing-helpers.test.mjs`:

- Flimsy paper rubbed on a touchstone leaves white streaks.
- Potion of water rubbed on a touchstone remains glass and does not use wetstone wording.
- Liquid venom rubbed on a touchstone uses wetstone/wetter wording.
- Material canaries for sack, tallow candle, Bell of Opening, and Candelabrum of Invocation use object material rather than display-name substrings alone.

## Fresh Subagent Findings Kept For Next Slices

- `tiphat()` still needs shared conflict detection for worn ring of conflict plus C-shaped hostile/conflicted RNG wording. Peaceful visible humanoid wave/tip/cursed-helmet structure is mostly present, but conflict should route it into the rude branch.
- Lateral wand polymorph is still adjacent-only. C `bhit()` traverses up to `rn1(8,6)` squares, checks monsters before floor piles, and `bhitpile()` consumes range only when an actual effect happened. Floor amulet of unchanging also needs to be hard-unpolyable for wand polymorph piles.
- Monster-thrown `drop_throw(obj, ohit, x, y)` still needs hit-only missile mulch before shipping/floor/stacking, hit-state threading from production throw paths, and passive-object delivery before stack merging.
- Ordinary stairs/ladders/special-stairs object migration is still shaft-only in JS. The next no-regression slice should add per-object route metadata while preserving raw shaft queue compatibility, then deliver route-tagged objects at reciprocal up stairs/ladders.

## Verification

- `node --check js/cmd.js`
- `node --test --test-name-pattern='touchstone|stone|ruby|gold ring|gray stone|#rub|flimsy|wetstone|venom|material canaries|potions rubbed' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` -> `44/44 passing`
