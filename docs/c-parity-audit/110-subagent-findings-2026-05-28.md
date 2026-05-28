# Subagent Findings 110 - Upward Ordinary Egg Toss-Up

## Implemented Slice: Non-Petrifying Egg `toss_up()` Breakage

Broadened the upward hero-thrown non-potion `toss_up()` path from cream pies and melons to ordinary eggs. The JS path now accepts upward egg throws when the egg does not need the deferred touch-petrification or pyrolisk explosion branches, consumes C-shaped roof and break-resistance rolls, supports ceiling breakage, supports fallback self-hit splat plus face wording, removes the thrown unit, and converts unpaid broken units into shop debt.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward non-returning throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1260`: egg/corpse petrification in this path is bounded by `touch_petrifies()`, which covers cockatrice and chickatrice but not Medusa's eaten-flesh rule.
- `nethack-c/upstream/src/dothrow.c:1267`: roof-hit breakable objects print a ceiling-hit line and then break through `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: non-roof-hit and non-broken roof-hit objects fall back on the hero's head with shared wording.
- `nethack-c/upstream/src/dothrow.c:1291`: non-potion breakable objects enter the `breaktest()` branch after falling back.
- `nethack-c/upstream/src/dothrow.c:1295`: blindness increments are only for cream pies and blinding venom, so eggs do not blind the hero.
- `nethack-c/upstream/src/dothrow.c:1305`: non-petrifying eggs fall through to the shared face-splat aftermath.
- `nethack-c/upstream/src/dothrow.c:2597`: `breaktest()` includes eggs and uses object resistance before breakage.
- `nethack-c/upstream/src/dothrow.c:2640`: egg `breakmsg()` prints `Splat!`.
- `nethack-c/upstream/src/dothrow.c:2525`: `breakobj()` has additional egg-specific bad-luck and pyrolisk explosion handling, so pyrolisk eggs remain deferred.
- `nethack-c/upstream/src/dothrow.c:2542`: broken unpaid objects route through `breakobj()` shop cleanup and lost-merchandise billing.

Covered JS behavior:

- `js/cmd.js`: upward throw direction now accepts ordinary eggs instead of falling into command-assist direction handling.
- `js/cmd.js`: roof-hit ordinary eggs can break on the ceiling with `An egg hits the ceiling.  Splat!`.
- `js/cmd.js`: non-roof-hit ordinary eggs fall back on the hero's head, then print `Splat!` and `You've got it all over your face!`.
- `js/cmd.js`: ordinary eggs do not apply cream-pie blindness or `ucreamed`.
- `js/cmd.js`: cockatrice/chickatrice eggs and pyrolisk eggs remain outside this branch for later dedicated slices.
- `js/cmd.js`: unpaid egg stacks split the thrown unit first, preserve the residual live bill row, and move the broken thrown unit into shop debt.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: upward ordinary egg self-hits, breaks, splats on the hero's face, and consumes the C-shaped `rn2(5)` plus break-resistance RNG shape.
- `test/shop-billing-helpers.test.mjs`: upward ordinary egg can break on the ceiling without fallback head/face wording.
- `test/shop-billing-helpers.test.mjs`: upward unpaid ordinary egg stack preserves the residual bill and charges one broken unit as shop debt.

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Blinding venom, expensive cameras, and glass/crystal object breakage remain separate non-potion `toss_up()` slices.
- Pyrolisk eggs need the `breakobj()` explosion branch before they are safe to fold into egg handling.
- Touch-petrifying eggs/corpses need stone-resistance, stone-golem polymorph rescue, and helmet wording before they are safe to implement.
- Generic non-breakable upward impacts still need `dmgval()`, weight-derived damage, hard-helmet mitigation, `Maybe_Half_Phys()`, silver/blessed bonuses, harmless missiles, and survivor `hitfloor()` disposition.
