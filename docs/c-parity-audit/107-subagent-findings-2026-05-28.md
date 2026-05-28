# Subagent Findings 107 - Upward Polymorph Potion Self-Hit

## Implemented Slice: Polymorph In Self `potionhit()`

Broadened the upward hero-thrown potion self-hit path to include potion of polymorph. The path now follows C ordering for `toss_up()` fallback into self `potionhit()`: fall-back text, random bottle crash, `rnd(2)` head damage, visible evaporation, the polymorph self effect, vapor handling, shop debt conversion, and object cleanup.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward non-returning throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1268`: roof-hit breakable potions break on the ceiling through `breakobj()` instead of self-hitting.
- `nethack-c/upstream/src/dothrow.c:1284`: fallback text says the object hits or almost hits the ceiling and falls back on the hero's head.
- `nethack-c/upstream/src/dothrow.c:1289`: fallback potions call `potionhit(&gy.youmonst, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1633`: self `potionhit()` prints the random bottle crash, then applies `Maybe_Half_Phys(rnd(2))` head damage.
- `nethack-c/upstream/src/potion.c:1679`: non-oil self-hit potions visibly evaporate before direct special self effects.
- `nethack-c/upstream/src/potion.c:1689`: polymorph self-hit prints `You feel a little strange/normal` and calls `polyself(POLY_NOFLAGS)` only when the hero lacks `Unchanging` and `Antimagic`.
- `nethack-c/upstream/src/polyself.c:488`: uncontrolled polyself can system-shock via `rn2(20) > ACURR(A_CON)`, then `rnd(30)` damage and constitution exercise.
- `nethack-c/upstream/src/polyself.c:698`: non-shocked uncontrolled polyself chooses a random ordinary monster before the final `newman()`/`polymon()` choice.
- `nethack-c/upstream/src/potion.c:1906`: vapor/trycall handling runs after the direct self effect.
- `nethack-c/upstream/src/potion.c:2092`: polymorph vapor only exercises constitution; it does not transform the hero again.

Covered JS behavior:

- `js/cmd.js`: upward potion support now allows polymorph while keeping lit oil deferred.
- `js/cmd.js`: polymorph self-hit appends `You feel a little strange` or hallucinated `normal` after evaporation and before vapor.
- `js/cmd.js`: `Unchanging` and `Antimagic` block the transform attempt without printing `You fail to transform`, matching the caller-side C gate.
- `js/cmd.js`: non-blocked polymorph self-hit reuses the existing JS `polymorphSystemShock()` and `becomeMonster()` polyself paths, then still runs the polymorph vapor/debt tail.
- `js/cmd.js`: queued `--More--` state from the reused polyself helper is preserved when the transformation message needs it.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: upward polymorph potion self-hits, evaporates, prints the feel message, and polymorphs the hero when constitution avoids system shock.
- `test/shop-billing-helpers.test.mjs`: upward polymorph potion system shock leaves the hero unpolymorphed and preserves the self-hit/vapor RNG shape.
- `test/shop-billing-helpers.test.mjs`: upward polymorph potion with `Unchanging` still prints the feel message and vapor exercise while skipping transform/shock.

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Full `polyself()` fidelity remains broader work: exact C form selection, controlled polymorph prompts, armor/body fallout, sex/race/role interactions, `newman()` details, and all `polymon()` side effects are only covered where existing JS helpers already model them.
- `Maybe_Half_Phys()` mitigation is not modeled for the covered head/acid damage path yet.
- Upward cream pies are covered in `docs/c-parity-audit/108-subagent-findings-2026-05-28.md`; other non-potion upward impacts, petrifying eggs/corpses, and heavier falling-object damage remain separate C-backed slices.
