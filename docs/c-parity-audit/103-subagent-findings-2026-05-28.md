# Subagent Findings 103 - Upward Potion Self-Hit

## Implemented Slice: Upward Hero-Thrown Confusion/Booze Potion `potionhit()`

Added the first C-backed upward throw path for potions. When the hero throws a supported non-special dizzy-vapor potion upward, JS now consumes the C `rn2(5)` roof roll and either:

- follows `toss_up()` into self `potionhit()` when the roof is not hit, or
- breaks the potion on the ceiling and routes vapor through the existing broken-potion path when the roof is hit and the potion breaks.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1265`: `toss_up()` distinguishes no ceiling, roof hit, and almost-hit fallback.
- `nethack-c/upstream/src/dothrow.c:1268`: roof-hit breakable objects hit the ceiling, run `breakmsg()`, and call `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: fallback objects fall back on the hero's head.
- `nethack-c/upstream/src/dothrow.c:1289`: fallback potions call `potionhit(&gy.youmonst, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1633`: self-targeted `potionhit()` uses the hero crash branch.
- `nethack-c/upstream/src/potion.c:1636`: the random bottle word crashes on the hero's head and breaks into shards.
- `nethack-c/upstream/src/potion.c:1638`: crash damage is `rnd(2)`.
- `nethack-c/upstream/src/potion.c:1680`: visible non-oil potions evaporate.
- `nethack-c/upstream/src/potion.c:1907`: distance zero always breathes vapor without the adjacent splash RNG.
- `nethack-c/upstream/src/potion.c:2027`: confusion/booze vapor prints the dizziness message and extends confusion with `rnd(5)`.
- `nethack-c/upstream/src/potion.c:1946`: a wet worn towel blocks vapor effects with the harmless-vapor message.
- `nethack-c/upstream/src/potion.c:1923`: unpaid hero-thrown potions are charged with `stolen_value()` before `obfree()`.

JS implementation:

- `js/cmd.js`: the throw-direction command now recognizes `<` for supported thrown potions before the XY projectile path.
- `js/cmd.js`: stack throws split a one-potion thrown object and split shop bill rows before the upward impact resolves.
- `js/cmd.js`: the self-hit helper mirrors the fallback message, random bottle crash, `rnd(2)` HP loss, evaporation, direct `potionBreathe()`, and silent broken shop debt conversion.
- `js/cmd.js`: the ceiling-hit helper uses the existing hard-break message and `brokenPotionBreathe()` path, preserving the odor prelude for breakage on the ceiling rather than self-hit.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: upward hero-thrown confusion potion self-hits, consumes the potion, leaves no floor object, applies HP loss and confusion vapor, and preserves the no-odor self-hit message ordering with RNG order `rn2(5)`, `rn2(7)`, `rnd(2)`, `rnd(5)`.
- `test/shop-billing-helpers.test.mjs`: an unpaid stack split charges only the thrown unit while leaving the residual stack and parent bill row live.
- `test/shop-billing-helpers.test.mjs`: a wet worn towel blocks the upward self-hit confusion vapor while the bottle still crashes and evaporates.

## Remaining Upward Throw Gaps

- Follow-up note: `docs/c-parity-audit/104-subagent-findings-2026-05-28.md` broadens this from confusion/booze to the supported non-special vapor-only potion set.
- Lit oil, acid, and polymorph self-hit branches remain separate because C has special direct hero effects before or around vapor.
- Non-potion upward object hits, cream pies, eggs/corpses with petrification, falling damage for heavier objects, no-ceiling wording, and underwater handling remain separate.
- The general command-mode issue where inventory letter `c` is intercepted by the close command before `throwObject` remains an input-command slice; tests use a non-conflicting inventory letter.
