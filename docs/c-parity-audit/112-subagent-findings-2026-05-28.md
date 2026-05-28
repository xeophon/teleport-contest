# Subagent Findings 112 - Upward Expensive Camera Toss-Up

## Implemented Slice: Camera `toss_up()` Breakage and Demon Release

Broadened the upward hero-thrown non-potion `toss_up()` path from ordinary fragile glass tools to expensive cameras. The JS path now accepts upward expensive-camera throws, consumes the C-shaped roof, break-resistance, release-chance, and demon-species RNG order, supports ceiling breakage, supports fallback self-hit breakage, removes the thrown camera, optionally releases a picture-painting demon adjacent to the hero, sets the released monster peacefulness from the camera curse state, and converts unpaid broken cameras into shop debt after the break side effect.

C source:

- `nethack-c/upstream/src/dothrow.c:1588`: upward non-returning throws call `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1267`: roof-hit breakable objects print a ceiling-hit line and then call `breakmsg()`/`breakobj()`.
- `nethack-c/upstream/src/dothrow.c:1284`: non-roof-hit and non-broken roof-hit objects fall back on the hero's head with shared wording.
- `nethack-c/upstream/src/dothrow.c:1291`: non-potion breakable objects enter the fallback `breaktest()` branch after hitting the hero.
- `nethack-c/upstream/src/dothrow.c:2457`: `release_camera_demon()` uses a 1-in-3 release chance, chooses homunculus 2/3 versus imp 1/3, creates it with `MM_NOMSG`, prints the picture-painting demon release line when visible, sets `mpeaceful = !obj->cursed`, then calls `set_malign()`.
- `nethack-c/upstream/src/dothrow.c:2522`: `breakobj()` dispatches expensive-camera breakage through `release_camera_demon()`.
- `nethack-c/upstream/src/dothrow.c:2542`: `breakobj()` handles hero-caused shop cleanup after break side effects and before object deletion.
- `nethack-c/upstream/src/dothrow.c:2592`: `breaktest()` performs object resistance before deciding breakage.
- `nethack-c/upstream/src/dothrow.c:2598`: expensive cameras are explicitly breakable after resistance.
- `nethack-c/upstream/src/dothrow.c:2626`: expensive cameras use the "into a thousand pieces" `breakmsg()` suffix.

Covered JS behavior:

- `js/cmd.js`: upward throw direction now accepts expensive cameras instead of falling into command-assist direction handling.
- `js/cmd.js`: roof-hit expensive cameras can break on the ceiling with the C-shaped ceiling-hit line followed by "shatters into a thousand pieces".
- `js/cmd.js`: non-roof-hit expensive cameras fall back on the hero's head, then shatter without potion crash/evaporation, splat, or cream-pie face effects.
- `js/cmd.js`: broken cameras consume `rn2(3)` for the release chance and only consume the species `rn2(3)` when release occurs.
- `js/cmd.js`: released camera demons are created adjacent to the hero through existing `makemon()` relocation and use existing homunculus/imp monster data.
- `js/cmd.js`: released camera demons are peaceful for non-cursed cameras and hostile for cursed cameras.
- `js/cmd.js`: unpaid camera breakage converts the broken thrown unit into shop debt after release handling.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: upward expensive camera self-hit shatters, releases a visible peaceful homunculus with the expected RNG prefix, removes the camera, and leaves no floor object.
- `test/shop-billing-helpers.test.mjs`: upward cursed expensive camera ceiling break shatters, releases a hostile imp, and skips fallback head wording.
- `test/shop-billing-helpers.test.mjs`: upward unpaid expensive camera ceiling break can consume the no-release RNG branch, remove the bill row, and charge the broken camera as shop debt.

## Remaining Upward Throw Gaps

- Lit oil self-hit and ceiling break still need `explode_oil()`/burning-oil fallout ordering, including blast terrain/object collateral and shop cleanup.
- Blinding venom remains a separate non-potion `toss_up()` slice because C applies cream-pie-like blindness and venom splash wording through venom object delivery.
- Glass/crystal wand breakage is covered in `113-subagent-findings-2026-05-28.md`; crackable glass armor and generic glass/crystal objects remain separate because they need armor erosion and broader object registry/material coverage.
- Pyrolisk eggs need the `breakobj()` explosion branch before they are safe to fold into egg handling.
- Touch-petrifying eggs/corpses need stone-resistance, stone-golem polymorph rescue, and helmet wording before they are safe to implement.
- Generic non-breakable upward impacts still need `dmgval()`, weight-derived damage, hard-helmet mitigation, `Maybe_Half_Phys()`, silver/blessed bonuses, harmless missiles, and survivor `hitfloor()` disposition.
