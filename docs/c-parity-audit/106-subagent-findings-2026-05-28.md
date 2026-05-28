# Subagent Findings 106 - Upward Throw Ceiling Wording

## Implemented Slice: `toss_up()` Ceiling Names And No-Ceiling Branch

Broadened the upward hero-thrown potion path so the shared `toss_up()` wrapper no longer hardcodes `ceiling`. The wrapper now preserves C's upward roll ordering while choosing the C-shaped ceiling label for ordinary ceilings, underwater throws, and no-ceiling endgame levels.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward non-returning throws call `toss_up(obj, rn2(5) && !Underwater)`, so the `rn2(5)` roll is consumed before `toss_up()` even when the hero is underwater or the level has no ceiling.
- `nethack-c/upstream/src/dothrow.c:1265`: when `has_ceiling(&u.uz)` is false, `toss_up()` uses `flies up into`.
- `nethack-c/upstream/src/dothrow.c:1269`: roof-hit text names `ceiling(u.ux, u.uy)`.
- `nethack-c/upstream/src/dothrow.c:1284`: fall-back-on-head text also names `ceiling(u.ux, u.uy)`.
- `nethack-c/upstream/src/dungeon.c:1690`: `has_ceiling()` is false in the endgame except the Plane of Earth.
- `nethack-c/upstream/src/dungeon.c:1714`: `ceiling()` chooses vault, temple, shop, water above, sky, flames above, expanse above, water's surface, ordinary ceiling, or rock cavern in that order.
- `nethack-c/upstream/include/youprop.h:279`: `Underwater` maps to `u.uinwater`.

Covered JS behavior:

- `js/cmd.js`: upward potion self-hit and ceiling-break messages now call a shared C-shaped ceiling-name helper.
- `js/cmd.js`: the roof roll remains `rn2(5) && !Underwater`; the random roll is still consumed before the underwater/no-ceiling branch suppresses a roof hit.
- `js/cmd.js`: underwater upward throws use `almost hits the water's surface`.
- `js/cmd.js`: no-ceiling endgame throws use `flies up into` and still run the same self `potionhit()` crash, damage, vapor, shop-debt, and cleanup tail.
- `js/cmd.js`: ordinary unset-level harness state avoids the JS `In_quest(undefined)` ambiguity and keeps ordinary room squares on `ceiling`.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: underwater upward confusion potion consumes `rn2(5)`, suppresses the roof-hit branch, says `almost hits the water's surface`, and keeps the self-hit vapor/debt tail.
- `test/shop-billing-helpers.test.mjs`: Plane-of-Air/no-ceiling upward confusion potion consumes `rn2(5)`, says `flies up into the sky`, and keeps the self-hit vapor/debt tail.
- Existing upward potion tests continue to cover ordinary `ceiling`, ceiling-break, stack billing, acid, unlit oil, and wet-towel vapor blocking.

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Polymorph self-hit needs `You feel a little strange/normal`, unchanging/antimagic gates, and `polyself()` fallout before vapor.
- `Maybe_Half_Phys()` mitigation is not modeled for the covered head/acid damage path yet.
- Non-potion upward impacts, cream pies, petrifying eggs/corpses, and heavier falling-object damage remain separate C-backed slices.
