# C Parity Audit 221: Polyself Breakarm Armor

## Sources

- `nethack-c/upstream/src/polyself.c:886-890`: successful `polymon()` restores mismatched dragon skin, calls `break_armor()`, then `drop_weapon(1)`, then `find_ac()`.
- `nethack-c/upstream/src/mondata.c:632-649`: `sliparm()` excludes whirly, small-or-smaller, and noncorporeal forms from `breakarm()`; `breakarm()` then covers big monsters, medium-or-larger non-humanoids, mariliths, and winged gargoyles.
- `nethack-c/upstream/include/monsters.h:2357-2366`: xorn is medium, wall-walking, metallivorous, strong, and not humanoid or no-hands, so it takes `breakarm()` rather than `sliparm()`.
- `nethack-c/upstream/src/polyself.c:1156-1197`: `break_armor()` destroys worn body armor with `You break out of your armor!`, drops or destroys worn cloak-slot items with cloak-specific wording, and destroys worn shirts with `Your shirt rips to shreds!`.
- `nethack-c/upstream/src/polyself.c:1121-1154`: `dropp()` unwears and drops cloak-slot fallout onto the floor.
- `nethack-c/upstream/src/objnam.c:5492-5506`: `cloak_simple_name()` uses `cloak`, `robe`, `wrapping`, and known/unknown alchemy smock naming.

## JS Changes

- Added successful-polyself breakarm detection that first excludes currently modeled slip forms, then uses existing `big` metadata plus explicit source-backed rows for xorn, marilith, and winged gargoyle.
- Added whirly recognition for vortex glyphs and air elemental so slip-form checks do not accidentally route those forms through breakarm.
- Split polyself fallout into dropped items and destroyed items. Destroyed body armor and shirts now use `useUpInventoryItem()` so existing used-up shop billing hooks remain in the removal path.
- Added breakarm cloak handling for normal cloaks, mummy wrapping, and alchemy smock wording/drop behavior.
- Kept the legacy overloaded no-hands body-armor path intact by continuing to queue passed `bodyArmor` items outside the new breakarm branch.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful debug polyself into xorn while wearing leather armor, a cloak of displacement, and a T-shirt.
- Assert C message order: body armor break, cloak clasp break, shirt shredding.
- Assert body armor and shirt are destroyed, the normal cloak lands on the hero square, and polyself AC is recomputed from the resulting form/equipment state.

## Remaining Gaps

- The port still lacks complete generated C monster size and humanoid metadata; this slice uses existing `big` coverage plus explicit source-backed breakarm rows rather than a full `mondata.c` predicate table.
- Mummy wrapping and alchemy smock breakarm branches are implemented but do not yet have focused regression tests.
- The delayed overloaded body-armor path remains a legacy screen-flow path; broader `break_armor()`/`sliparm()` ordering across body armor, cloak, shirt, gloves, weapons, shield, helm, boots, eyewear, rings, and horns is still not one fully shared C-shaped routine.
- Shop-specific payment assertions for unpaid body armor or shirts destroyed by breakarm remain open, though the destroy path now routes through `useUpInventoryItem()`.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="successful breakarm polyself|successful very small polyself|successful no-hands polyself|successful no-head polyself" test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `bash frozen/score.sh sessions/seed4500-knight-coverage.session.json` (`1/1` passing after restoring legacy no-hands body-armor queuing)
- `node --test test/shop-billing-helpers.test.mjs` (`1102/1102` passed)
- `node --test test/*.mjs` (`1199/1199` passed)
- `npm run score` (`44/44` passing)
