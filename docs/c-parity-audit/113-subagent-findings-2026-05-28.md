# Subagent Findings 113 - Upward Glass and Crystal Wand Toss-Up

## Implemented Slice: Glass-Material Wand Breakage

Broadened the upward hero-thrown non-potion `toss_up()` fragile-object path to include glass-material wands. In C, wand descriptions are shuffled together with material, so the breakable cases are the current glass/crystal material appearances, not fixed actual wand spell names. The JS path now treats explicit `material`/`oc_material` glass or crystal, or an unknown/current wand appearance of glass/crystal, as a thousand-pieces fragile object for upward ceiling breaks and fallback self-hit breaks.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward non-returning throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1267`: roof-hit breakable objects print a ceiling-hit line and then call `breakmsg()`/`breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: non-roof-hit and non-broken roof-hit objects fall back on the hero's head with shared wording.
- `nethack-c/upstream/src/dothrow.c:1291`: non-potion breakable objects enter the fallback `breaktest()` branch after hitting the hero.
- `nethack-c/upstream/src/dothrow.c:2592`: `breaktest()` performs object resistance before deciding breakage.
- `nethack-c/upstream/src/dothrow.c:2594`: non-artifact, non-gem GLASS objects break after resistance.
- `nethack-c/upstream/src/dothrow.c:2621`: `breakmsg()` defaults to the glass/crystal wand branch.
- `nethack-c/upstream/src/dothrow.c:2626`: glass/crystal wands use the "into a thousand pieces" suffix.
- `nethack-c/upstream/include/objects.h:1449`: the seed glass wand entry is GLASS material.
- `nethack-c/upstream/include/objects.h:1454`: the seed crystal wand entry is GLASS material.
- `nethack-c/upstream/src/o_init.c:113`: object description shuffling can also swap material.
- `nethack-c/upstream/src/o_init.c:337`: whole WAND_CLASS shuffling uses material shuffling.

Covered JS behavior:

- `js/cmd.js`: glass/crystal material wands now return the `pieces` top-level break kind before the generic glass/crystal name fallback.
- `js/cmd.js`: unknown wands can preserve an explicit `appearance` for C-style current material/name display in tests and local object data.
- `js/cmd.js`: the existing upward fragile-object path handles roof-hit breakage, fallback self-hit breakage, object removal, and broken-unit shop debt for glass/crystal wands.
- `js/cmd.js`: artifact-marked wands remain excluded from this glass-material break predicate, matching C's non-artifact material branch.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: upward unknown glass wand self-hit uses fallback head wording, shatters into a thousand pieces, removes the wand, and does not apply potion or cream-pie effects.
- `test/shop-billing-helpers.test.mjs`: upward known glass-material wand can break on the ceiling without fallback head wording.
- `test/shop-billing-helpers.test.mjs`: upward unpaid glass-material wand removes the live bill row and charges the broken wand as shop debt.

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Blinding venom remains a separate non-potion `toss_up()` slice because C applies `Splash!`, cream-pie-like face splatter, and venom blindness through venom object delivery.
- Crackable glass armor remains separate because C gives glass armor a 90% nonbreak chance and routes breakage through `is_crackable()`/`erode_obj()` instead of deleting it with the wand path.
- Broader glass/crystal object breakage remains separate until more object metadata is registry-backed instead of name-only.
- Pyrolisk eggs need the `breakobj()` explosion branch before they are safe to fold into egg handling.
- Touch-petrifying eggs/corpses need stone-resistance, stone-golem polymorph rescue, and helmet wording before they are safe to implement.
- Generic non-breakable upward impacts still need `dmgval()`, weight-derived damage, hard-helmet mitigation, `Maybe_Half_Phys()` mitigation, silver/blessed bonuses, harmless missiles, and survivor `hitfloor()` disposition.
