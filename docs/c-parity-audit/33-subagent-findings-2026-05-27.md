# C Parity Audit 33: Unicorn Horn and Amethyst Potion Neutralization

## Scope

This slice adds the bounded late `potion_dip()` neutralization branch for unicorn horns and amethyst stones. It covers the C `mixtype()` rows for sickness, hallucination, blindness, confusion, and booze; one-potion stack splitting; `COST_NUTRLZ` shop billing before mutation; result BUC/dilution state; visible and blind message behavior; no-effect `Interesting...` fallback for nonmatching pairs; and source-first inventory action routing through the same matrix. Neutral water damage, potion-potion alchemy, polymorph-potion dipping, and full source/target menu parity remain separate work.

## C Source Notes

- `nethack-c/upstream/src/potion.c:2122-2164`: `mixtype()` maps unicorn horn plus sickness to fruit juice, unicorn horn plus hallucination/blindness/confusion to water, and amethyst plus booze to fruit juice.
- `nethack-c/upstream/src/potion.c:2726-2787`: the horn/amethyst branch runs after water, polymorph, alchemy, poison coating/removal, acid, oil, and lamp refuel. Nonmatching pairs fall through to final `Interesting...` without splitting, billing, consuming, or mutating the source.
- `nethack-c/upstream/src/potion.c:2739-2746`: successful neutralization splits one source potion from a stack and calls `costly_alteration(singlepotion, COST_NUTRLZ)` before changing the potion type.
- `nethack-c/upstream/src/potion.c:2747-2754`: mutation sets the result type, clears blessed, sets non-water curse state from the horn/amethyst, clears water curse and dilution for water results, clears BUC knowledge, and provisionally clears description knowledge.
- `nethack-c/upstream/src/potion.c:2755-2768`: visible heroes get a transformation message; blind heroes do not. Stack sources add `that you dipped into`; water results clear, while fruit-juice results turn to the new appearance.
- `nethack-c/upstream/src/potion.c:2783`: `hold_potion()` reinserts the transformed single potion and can merge it with compatible inventory stacks.

## JS Status

- `js/cmd.js:10534-10557`: local neutralization target/source mapping now mirrors the C rows for unicorn horn and amethyst.
- `js/cmd.js:7769-7789` and `js/cmd.js:11485-11487`: the existing carried-stack split pattern is shared so neutralization, oil apply, and cream-pie splat all split one carried object with bill-row preservation.
- `js/cmd.js:11582-11596`: horn and amethyst targets now allow carried potion sources in both target-first and source-first dip menus, so source-first `#altdip` uses the same target matrix.
- `js/cmd.js:11735-11827`: neutralization handles split-one source stacks, pre-mutation `neutralize` billing, result identity/BUC/dilution resets, visible/blind messages, and compatible inventory reinsertion/merge.
- `js/cmd.js:11949-11955`: dispatch keeps horn/amethyst after the implemented water, acid, oil, and poisonable-weapon branches.
- `js/cmd.js:11740-11742`, `js/cmd.js:44578-44579`, and `js/cmd.js:44622-44624`: successful no-topline cases, such as blind neutralization without billing, are now distinguished from true no-effect `Interesting...` falls-through.
- `test/shop-billing-helpers.test.mjs:3714-3893`: focused coverage verifies source-first horn targeting, sickness-stack splitting to fruit juice, confusion/blindness/hallucination conversion to uncursed undiluted water, cursed horn/amethyst fruit-juice curse propagation, nonmatching horn no-effect behavior, unpaid source-stack bill splitting plus used-up dummy billing, and blind no-transform-message success.

## Parallel Follow-Up Audits

- Neutral water should land before potion-potion alchemy. C routes neutral water through `water_damage()` early in `potion_dip()`, and JS already has partial floor/liquid and rust-trap damage helpers that can be consolidated for carried-object `#dip`.
- Potion-potion alchemy is larger than horn/amethyst because it needs the full `mixtype()` potion table, source and target stack splitting, bad-mixture/explosion handling, result mutation, discovery state, and reinsert/merge behavior.

## Remaining Follow-Ups

- Neutral-water carried-object `water_damage()` through potion `#dip` is covered in Audit 34, including grease, acid destruction, potion dilution, scroll/spellbook blanking, container contents, rust erosion, and towels. Shared water-damage primitives and deeper water discovery/type-call behavior remain open.
- Potion-potion alchemy, polymorph potion dipping, broader source/target menus, and generic unsupported matrix branches remain separate potion slices.
- The current JS still exposes potion identities more directly than C's appearance/type discovery split; deeper potion work should eventually centralize description, type-call, `dknown`, and discovery handling.
