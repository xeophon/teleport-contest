# C Parity Audit 222: Polyself Whirly Sliparm

## Sources

- `nethack-c/upstream/include/mondata.h:57-58`: `is_whirly(ptr)` covers all vortex `mlet` rows plus air elemental.
- `nethack-c/upstream/include/monsters.h:1053-1067`, `nethack-c/upstream/include/monsters.h:1574-1581`: fog cloud and vortices use `S_VORTEX`; air elemental is `S_ELEMENTAL` but is explicitly included by `is_whirly()`.
- `nethack-c/upstream/src/mondata.c:632-649`: `sliparm()` is true for whirly, small-or-smaller, and noncorporeal forms; `breakarm()` returns false when `sliparm()` is true.
- `nethack-c/upstream/src/polyself.c:886-890`: successful `polymon()` calls `break_armor()`, then standalone `drop_weapon(1)`, then `find_ac()`.
- `nethack-c/upstream/src/polyself.c:1198-1227`: whirly `sliparm()` drops body armor, cloak, and shirt with `Your armor falls around you!`, `Your %s falls, unsupported!`, and `You seep right through your shirt!`.
- `nethack-c/upstream/src/polyself.c:1248-1277`: no-hands fallout follows the sliparm rows and handles gloves/weapon, shield, helm, and boots; whirly boots use `Your boots fall away!`.
- `nethack-c/upstream/src/polyself.c:1319-1335`: when gloves did not already drop a wielded weapon, standalone `drop_weapon(1)` runs after armor fallout.
- `nethack-c/upstream/include/monflag.h:98`: `M1_NOLIMBS` includes `M1_NOHANDS`, so whirly/no-limbs forms should take no-hands equipment fallout even when local generated metadata does not expose `nohands`.
- `nethack-c/upstream/src/objnam.c:5491-5506`: `cloak_simple_name()` supplies cloak, robe, wrapping, smock, and apron wording.

## JS Changes

- Extended successful-polyself slip fallout so whirly forms drop worn body armor, cloak-slot items, and shirts immediately instead of relying only on the legacy delayed body-armor path.
- Kept whirly forms out of breakarm routing, including huge whirly forms that otherwise look like armor breakers.
- Added a shared no-hands fallout predicate that treats whirly forms as no-hands fallout candidates despite the current JS monster metadata lacking that flag for vortex and air elemental rows.
- Added C whirly boot wording (`Your boots fall away!`) and moved the no-gloves standalone weapon drop after shield, helm, and boots, matching `break_armor()` followed by `drop_weapon(1)`.
- Preserved the passed `bodyArmor` fallback for the legacy overloaded body-armor flow outside the immediate whirly slip branch.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Successful debug polyself into fog cloud while wearing body armor, a cloak, and a shirt.
- Assert C message order for whirly sliparm: body armor, cloak, then shirt.
- Assert all three items are dropped, not destroyed, on the hero square with worn state cleared.
- Successful debug polyself into fog cloud while also wearing shield, helm, boots, and wielding a weapon without gloves.
- Assert no-hands fallout follows sliparm fallout and that standalone weapon drop comes after whirly boots.

## Remaining Gaps

- JS still lacks full generated C monster flags for `is_whirly()`, `M1_NOLIMBS`, size, humanoid, and corporeality; this slice keeps explicit local predicates rather than a generated `mondata.c` table.
- Non-whirly small and noncorporeal `sliparm()` body-armor/cloak branches remain only partially modeled compared with the full C routine.
- Robe, mummy-wrapping, and alchemy-smock whirly cloak names are supported through the shared simple-name helper but do not yet have separate focused tests.
- Standalone weapon dropping still uses the existing simplified `drop_weapon()` model; cursed weapon retention and `release` wording remain open.
- Shop-specific assertions for unpaid items dropped by whirly sliparm remain open.
- `break_armor()`/`sliparm()` ordering is closer, but the whole C routine is still split across local helpers and legacy delayed body-armor flow.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="successful whirly polyself|successful breakarm polyself|successful very small polyself|successful no-hands polyself|successful no-head polyself" test/shop-billing-helpers.test.mjs` (`7` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1104/1104` passed)
- `node --test test/*.mjs` (`1201/1201` passed)
- `npm run score` (`44/44` passing)
