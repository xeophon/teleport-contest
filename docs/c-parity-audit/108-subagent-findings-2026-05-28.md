# Subagent Findings 108 - Upward Cream Pie Toss-Up

## Implemented Slice: Breakable Non-Potion `toss_up()`

Broadened the upward hero-thrown path from potion-only handling to the first compact non-potion `toss_up()` branch: cream pies. The JS path now accepts upward cream-pie throws, consumes C-shaped roof and break-resistance rolls, supports ceiling breakage, supports fallback self-hit face splatter and blinding, removes the thrown unit, and converts unpaid broken units into shop debt.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward non-returning throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1268`: roof-hit breakable objects print a ceiling-hit line and then break through `breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: non-roof-hit and non-broken roof-hit objects fall back on the hero's head with shared wording.
- `nethack-c/upstream/src/dothrow.c:1291`: non-potion breakable objects enter the `breaktest()` branch after falling back.
- `nethack-c/upstream/src/dothrow.c:1294`: cream pies roll `rnd(25)` for face blindness only when `can_blnd()` allows it.
- `nethack-c/upstream/src/dothrow.c:1317`: cream pies print `You've got it all over your face!`, add to `u.ucreamed`, and call `make_blinded()`.
- `nethack-c/upstream/src/dothrow.c:2597`: `breaktest()` includes cream pies and uses object resistance before breakage.
- `nethack-c/upstream/src/dothrow.c:2641`: cream-pie `breakmsg()` prints `What a mess!` when visible.
- `nethack-c/upstream/src/dothrow.c:1190`: broken unpaid objects route through `check_shop_obj()`/lost-merchandise billing.

Covered JS behavior:

- `js/cmd.js`: upward throw direction now accepts cream pies instead of falling into command-assist direction handling.
- `js/cmd.js`: roof-hit cream pies can break on the ceiling with `A cream pie hits the ceiling.  What a mess!`.
- `js/cmd.js`: non-roof-hit cream pies fall back on the hero's head, then print `What a mess!` and the face-splat message.
- `js/cmd.js`: cream-pie self-hit updates `u.ucreamed`, blind timeout, blind state, and status suffix when the hero is not protected by a worn blindfold/towel.
- `js/cmd.js`: unpaid cream-pie stacks split the thrown unit first, preserve the residual live bill row, and move the broken thrown unit into shop debt.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: upward cream pie self-hits, breaks, blinds the hero, and consumes the C-shaped `rn2(5)`, break-resistance, and `rnd(25)` RNG shape.
- `test/shop-billing-helpers.test.mjs`: upward cream pie can break on the ceiling without face splatter or blinding.
- `test/shop-billing-helpers.test.mjs`: upward unpaid cream-pie stack preserves the residual bill and charges one broken unit as shop debt.

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Melons are covered in `109-subagent-findings-2026-05-28.md`; eggs, blinding venom, expensive cameras, and glass/crystal object breakage remain separate non-potion `toss_up()` slices.
- Petrifying eggs/corpses need stone-resistance, stone-golem polymorph rescue, and helmet wording before they are safe to implement.
- Generic non-breakable upward impacts still need `dmgval()`, weight-derived damage, hard-helmet mitigation, `Maybe_Half_Phys()`, silver/blessed bonuses, harmless missiles, and survivor `hitfloor()` disposition.
