# Subagent Findings 111 - Upward Fragile Glass Tool Toss-Up

## Implemented Slice: Mirror, Crystal Ball, and Lenses `toss_up()` Breakage

Broadened the upward hero-thrown non-potion `toss_up()` path from food breakables to the compact glass-tool set that can shatter into a thousand pieces without invoking deferred camera, crackable armor, wand, or generic-object fallout. The JS path now accepts mirrors/looking glasses, crystal balls/glass orbs, and lenses, consumes C-shaped roof and break-resistance rolls, supports ceiling breakage, supports fallback self-hit breakage, removes the thrown unit, applies mirror bad luck, and converts unpaid broken units into shop debt.

C source:

- `nethack-c/upstream/src/dothrow.c:1256`: upward non-returning throws run through `toss_up(obj, hitsroof)`.
- `nethack-c/upstream/src/dothrow.c:1267`: roof-hit breakable objects print a ceiling-hit line and then call `breakmsg()`/`breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: non-roof-hit and non-broken roof-hit objects fall back on the hero's head with shared wording.
- `nethack-c/upstream/src/dothrow.c:1291`: non-potion breakable objects enter the fallback `breaktest()` branch after hitting the hero.
- `nethack-c/upstream/src/dothrow.c:2494`: broken mirrors apply `change_luck(-2)` when hero-caused.
- `nethack-c/upstream/src/dothrow.c:2522`: expensive cameras release a camera demon on break, so cameras remain deferred.
- `nethack-c/upstream/src/dothrow.c:2542`: broken hero-caused unpaid objects route through shop cleanup and lost-merchandise billing.
- `nethack-c/upstream/src/dothrow.c:2582`: `breaktest()` performs object resistance before deciding breakage.
- `nethack-c/upstream/src/dothrow.c:2594`: non-artifact non-gem glass objects are breakable after resistance.
- `nethack-c/upstream/src/dothrow.c:2626`: lenses, mirrors, crystal balls, and expensive cameras use the "into a thousand pieces" `breakmsg()` suffix.
- `nethack-c/upstream/include/objects.h:936`, `:938`, `:944`: mirror, crystal ball, and lenses are GLASS tools/eyewear.

Covered JS behavior:

- `js/cmd.js`: upward throw direction now accepts mirrors/looking glasses, crystal balls/glass orbs, and lenses instead of falling into command-assist direction handling.
- `js/cmd.js`: roof-hit fragile glass tools can break on the ceiling with the C-shaped ceiling-hit line followed by "shatters into a thousand pieces".
- `js/cmd.js`: non-roof-hit fragile glass tools fall back on the hero's head, then shatter without potion crash/evaporation, splat, or cream-pie face effects.
- `js/cmd.js`: mirrors apply a `-2` luck penalty when broken by the hero.
- `js/cmd.js`: lenses use pair-article wording in upward hit and break messages.
- `js/cmd.js`: unpaid crystal balls move the broken thrown unit into shop debt and remove the live bill row.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: upward mirror self-hit shatters into a thousand pieces, consumes `rn2(5)` plus break-resistance RNG, removes the object, and applies `uluck -= 2`.
- `test/shop-billing-helpers.test.mjs`: upward crystal ball can shatter on the ceiling without fallback head wording.
- `test/shop-billing-helpers.test.mjs`: upward lenses self-hit uses "A pair of lenses" wording and shatters.
- `test/shop-billing-helpers.test.mjs`: upward unpaid crystal ball breakage charges the broken object as shop debt.

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Blinding venom remains a separate non-potion `toss_up()` slice because C applies cream-pie-like blindness and venom splash wording through venom object delivery.
- Expensive camera breakage and picture-painting demon release are covered in `112-subagent-findings-2026-05-28.md`.
- Glass/crystal wand breakage is covered in `113-subagent-findings-2026-05-28.md`; crackable glass armor and generic glass/crystal objects remain separate because they need armor erosion and broader object registry/material coverage.
- Pyrolisk eggs need the `breakobj()` explosion branch before they are safe to fold into egg handling.
- Touch-petrifying eggs/corpses need stone-resistance, stone-golem polymorph rescue, and helmet wording before they are safe to implement.
- Generic non-breakable upward impacts still need `dmgval()`, weight-derived damage, hard-helmet mitigation, `Maybe_Half_Phys()`, silver/blessed bonuses, harmless missiles, and survivor `hitfloor()` disposition.
