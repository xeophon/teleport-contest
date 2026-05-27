# C Parity Audit 36: Potion-Potion Alchemy Through #dip

## Scope

This slice adds the first local potion-potion alchemy branch for carried inventory `#dip`. It covers C's `mixtype()` recipe table for represented potion identities, target-stack affected-count selection, source potion consumption before instability checks, cursed/acid/lit-oil/random alchemic explosions, result BUC/dilution reset, deterministic recipe mutation, bad-mixture random water/sickness/random-potion/evaporation outcomes, visible result messages, and carried result re-merge through the existing potion-stack compatibility helper. Audit 37 adds bounded alchemy-explosion `potionbreathe()` vapor effects on top of this branch.

It intentionally remains short of full alchemy fidelity for exact object-registry `otyp`/appearance metadata, fumbling drop behavior from `hold_another_object()`, exact shop repricing for every altered unpaid target potion, thrown/broken potion vapor delivery, and non-`kn` `trycall()` prompt parity.

## C Source Anchors

- `nethack-c/upstream/src/potion.c:2122-2208`: `mixtype()` defines the recipe table. It normalizes some source/target orders, maps healing plus speed to extra healing, healing tiers plus gain level/energy to stronger healing or gain ability, gain level/energy plus confusion/healing/fruit juice/booze to special results, fruit juice plus sickness/enlightenment/speed/gain level/energy, and enlightenment plus levitation/fruit juice/booze.
- `nethack-c/upstream/src/potion.c:2279-2371`: target-first `#dip` selects the object, optionally offers floor features, then asks for a potion source and calls `potion_dip(obj, potion)`.
- `nethack-c/upstream/src/potion.c:2374-2404`: source-first `#altdip` selects the potion source first, skips floor features, then asks for a target and calls the same `potion_dip()` path.
- `nethack-c/upstream/src/potion.c:2448-2503`: `potion_dip()` rejects singleton self-potion and hands first, handles water and polymorph before alchemy, then enters alchemy only when the dipped object is a potion with a different type than the source potion.
- `nethack-c/upstream/src/potion.c:2504-2538`: alchemy computes the affected target count. Large diluted target stacks affect two potions, large magic-result stacks affect random 3..8, and large nonmagic stacks affect random 7..N. The source potion is consumed immediately after the mix message.
- `nethack-c/upstream/src/potion.c:2415-2435` and `nethack-c/upstream/src/potion.c:2538-2542`: explosions occur after source consumption if the affected target is cursed, acid, lit oil, or fails the random instability roll. Explosions destroy the affected stack and deal alchemic-blast damage.
- `nethack-c/upstream/src/potion.c:2544-2583`: successful alchemy clears BUC state, clears description knowledge while blind or hallucinating, mutates to the recipe result or bad-mixture random result, marks non-water results diluted, prints bubbling/clearing for water or color text for visible non-water results, and destroys evaporated mixtures.
- `nethack-c/upstream/src/potion.c:2585-2592` and `nethack-c/upstream/src/potion.c:2239-2258`: mutated potion stacks are removed and re-held through `hold_potion()`, which can merge them with compatible carried stacks or drop them while fumbling.

## JS Implementation Notes

- `js/cmd.js:7790-7808`: added a carried inventory split helper for affected sub-stacks larger than one item while preserving split shop bill rows.
- `js/cmd.js:11862-12140`: added local alchemy identity, `mixtype()` recipe, affected-count, instability, mutation, bad-mixture, message helpers, and Audit 37 vapor helpers.
- `js/cmd.js:12142-12240`: `dipPotionIntoPotion()` now consumes the source potion, handles alchemic explosions, mutates or evaporates the affected target stack, refreshes inventory/bill display, and tries to merge compatible results.
- `js/cmd.js:12609-12617`: potion `#dip` dispatch now keeps C ordering: water, polymorph, potion-potion alchemy, then acid/oil/weapon/horn-amethyst branches.
- `test/shop-billing-helpers.test.mjs:4102-4211`: focused public tests cover healing plus speed producing diluted extra healing, cursed bad-mixture explosion after source consumption, and Audit 37 vapor effects.

## Follow-Ups

- Add thrown/broken `potionhit()` vapor delivery, non-`kn` `trycall()` prompt parity, water vapor gremlin/lycanthropy transformations, and exact status-property mapping beyond Audit 37's bounded alchemy-explosion vapor effects.
- Replace the local potion identity table with registry-backed object metadata so all result `otyp`, appearance, cost, magicness, and merge rules come from one source.
- Finish exact `hold_another_object()` behavior for mutated potion stacks, especially fumbling drops and inventory capacity edge cases.
- Extend shop billing around altered unpaid target potions once object-registry pricing is centralized; source-stack consumption currently follows the existing residual used-up bill behavior.
- Implement the remaining self-potion/Klein-bottle path once source and target can intentionally be the same carried potion stack.
