# C Parity Audit 230: Polyself Helmet Surface Wording

## Sources

- `nethack-c/upstream/src/polyself.c:1239-1244`: horned-form hard helmet fallout reports `Your %s falls to the %s!`, using `helm_simple_name()` and `surface(u.ux, u.uy)` before `Helmet_off()` and `dropp()`.
- `nethack-c/upstream/src/polyself.c:1264-1270`: no-hands or very small forms force worn headgear through the same surface-based fall message, `Helmet_off()`, then `dropp()`.
- `nethack-c/upstream/src/dungeon.c:1750-1790`: `surface()` maps the hero square to water, ice, lava, bridge, altar, headstone, fountain, stairs, wall, doorway, floor, or ground, with waterlevel and underwater special cases.

## JS Changes

- Added `polyselfFalloffSurfaceName()` in `js/cmd.js` for the two forced helmet fallout paths.
- Replaced the previous hardcoded `ground` wording for horned hard-helmet removal and no-hands or very-small headgear removal.
- Reused the existing drawbridge-aware terrain normalization via `movementSurfaceTerrain()`, then mapped modeled terrain to the C surface vocabulary.
- Treated valid test/model squares without an explicit terrain type as ordinary room floor, matching the C fallback from `IS_ROOM()` to `floor` on normal levels.
- Kept boot fallout wording unchanged. C boot fallout does not call `surface()` in this path.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Existing no-hands, whirly, fedora, cornuthaum, helm of brilliance, helm of opposite alignment, and horned hard-helm falloff tests now expect ordinary floor wording instead of ground wording.
- No-hands polyself while standing on ice asserts `Your helm falls to the ice!` and separately verifies boots still use boot-specific wording.
- Horned polyself while standing on a fountain asserts `Your helm falls to the fountain!`.

## Remaining Gaps

- `Helmet_off()` telepathy and caution display refresh remains open.
- C hallucinated `hliquid()` vocabulary for water and lava surfaces is not modeled here.
- `surface()` branches for swallowed heroes and some stairs position details are still broader terrain wording work.
- Water-walking and levitation boot side effects from `Boots_off()` remain separate polyself fallout gaps.
- Weapon drop wording and cursed weapon retention during forced polyself remain separate from this helmet surface slice.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "uses hero surface|drops shield helm and boots|drops hard unpaid helm|fedora|cornuthaum|helm of brilliance|helm of opposite alignment" test/shop-billing-helpers.test.mjs` (`9` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1119/1119` tests passed)
- `node --test test/*.mjs` (`1216/1216` tests passed)
- `npm run score` (`44/44` passing)
