# Subagent Findings 109 - Upward Melon Toss-Up

## Implemented Slice: Melon `toss_up()` Breakage

Broadened the upward hero-thrown non-potion `toss_up()` path from cream pies to melons. The JS path now accepts upward melon throws, consumes C-shaped roof and break-resistance rolls, supports ceiling breakage, supports fallback self-hit breakage, removes the thrown unit, and converts unpaid broken units into shop debt.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward non-returning throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1267`: roof-hit breakable objects print a ceiling-hit line and then break through `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: non-roof-hit and non-broken roof-hit objects fall back on the hero's head with shared wording.
- `nethack-c/upstream/src/dothrow.c:1291`: non-potion breakable objects enter the `breaktest()` branch after falling back.
- `nethack-c/upstream/src/dothrow.c:1310`: fallback breakage only has special post-break effects for eggs, cream pies, and blinding venom, so melons splat without face splatter or blindness.
- `nethack-c/upstream/src/dothrow.c:2597`: `breaktest()` includes melons and uses object resistance before breakage.
- `nethack-c/upstream/src/dothrow.c:2641`: melon `breakmsg()` prints `Splat!` when visible.
- `nethack-c/upstream/src/dothrow.c:2542`: broken unpaid objects route through `breakobj()` shop cleanup and lost-merchandise billing.

Covered JS behavior:

- `js/cmd.js`: upward throw direction now accepts melons instead of falling into command-assist direction handling.
- `js/cmd.js`: roof-hit melons can break on the ceiling with `A melon hits the ceiling.  Splat!`.
- `js/cmd.js`: non-roof-hit melons fall back on the hero's head, then print `Splat!` and vanish without cream-pie face effects.
- `js/cmd.js`: unpaid melon stacks split the thrown unit first, preserve the residual live bill row, and move the broken thrown unit into shop debt.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: upward melon self-hits, breaks, leaves HP/blindness/`ucreamed` unchanged, and consumes the C-shaped `rn2(5)` plus break-resistance RNG shape.
- `test/shop-billing-helpers.test.mjs`: upward melon can break on the ceiling without fallback head/face wording.
- `test/shop-billing-helpers.test.mjs`: upward unpaid melon stack preserves the residual bill and charges one broken unit as shop debt.

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Eggs, blinding venom, expensive cameras, and glass/crystal object breakage remain separate non-potion `toss_up()` slices.
- Petrifying eggs/corpses need stone-resistance, stone-golem polymorph rescue, and helmet wording before they are safe to implement.
- Generic non-breakable upward impacts still need `dmgval()`, weight-derived damage, hard-helmet mitigation, `Maybe_Half_Phys()`, silver/blessed bonuses, harmless missiles, and survivor `hitfloor()` disposition.
