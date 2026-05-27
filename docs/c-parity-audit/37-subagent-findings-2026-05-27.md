# C Parity Audit 37: Alchemy Explosion Potion Vapors

## Scope

This slice adds bounded `potionbreathe()` parity for potion-potion alchemy explosions in carried inventory `#dip`. It preserves C's ordering where the source potion is consumed, the affected target stack explodes, target-stack vapor effects happen before the target stack is used up, and alchemic blast damage follows. The modeled vapor effects cover wet towel shielding, monster-form breath/eye gating, ability restoration/gain, healing-family HP and blindness/deafness cures, sickness, hallucination, confusion/booze, momentary invisibility, paralysis, sleeping, speed, blindness, and acid/polymorph constitution exercise.

This is not the full vapor subsystem. Hard-landing projectile broken-potion vapor is covered in Audit 38; direct `potionhit()` thrown/bash delivery, other broken-potion callers, non-`kn` `trycall()` prompt parity, water vapor gremlin/lycanthropy transformations, exact C intrinsic/status-property mapping, and a shared potion discovery/call-name primitive remain separate work.

## C Source Anchors

- `nethack-c/upstream/src/potion.c:1906-1911`: thrown or broken potion vapors call `potionbreathe()` when the hero is at close range and the current form can breathe or has eyes; otherwise visible `dknown` objects may prompt `trycall()`.
- `nethack-c/upstream/src/potion.c:1930-2118`: `potionbreathe()` handles wet towel shielding, vapor side effects, caller-owned object lifetime, and the `dknown` discovery split between `makeknown()` for `kn` effects and `trycall()` otherwise.
- `nethack-c/upstream/src/potion.c:1943-1949` and `nethack-c/upstream/include/youprop.h:403-406`: `Half_gas_damage` is a damp/wet worn towel in the blindfold slot and shields both breathing and eye effects.
- `nethack-c/upstream/src/potion.c:1950-2095`: modeled vapor effects include restore/gain ability, healing-family fallthrough, sickness, hallucination, confusion/booze, invisibility, paralysis, sleeping, speed, blindness, water, acid, and polymorph.
- `nethack-c/upstream/src/potion.c:2415-2435`: alchemy explosions set the object in use, print `BOOM!  They explode!`, wake nearby monsters, exercise strength, call `potionbreathe()` when the form can breathe or has eyes, use up the target stack, then apply `losehp(..., "alchemic blast")`.
- `nethack-c/upstream/src/potion.c:2533-2542`: potion-potion alchemy prints the mix message, consumes the source potion with `useup(potion)`, then evaluates explosion damage and target-stack destruction.
- `nethack-c/upstream/include/mondata.h:26` and `nethack-c/upstream/include/mondata.h:46`: the vapor gate is based on monster-form `breathless()` or `haseyes()`, not the hero's magical-breathing property.
- `nethack-c/upstream/include/hack.h:1530`, `nethack-c/upstream/src/o_init.c:454-458`, and `nethack-c/upstream/src/do.c:392-398`: `makeknown()` formally identifies an object type; `trycall()` only prompts when the type is not already known or user-named.

## JS Implementation Notes

- `js/cmd.js:11965-12140`: added local vapor helpers and `potionBreathe()` for the modeled C vapor effects, including wet towel shielding and known-effect discovery for `kn` cases.
- `js/cmd.js:12142-12160`: `dipPotionAlchemyExplosion()` now calls `potionBreathe()` after explosion messaging and strength exercise, before `useUpInventoryItem()` removes the target stack and before alchemic blast damage is applied.
- `test/shop-billing-helpers.test.mjs:4133-4211`: focused tests cover cursed confusion vapor after source consumption, wet worn towel shielding, and known blindness vapor discovery.

## Follow-Ups

- Add direct `potionhit()` thrown/bash vapor delivery, other broken-potion callers outside Audit 38, and visible-object fallback `trycall()` prompting outside alchemy.
- Implement water vapor's gremlin split and lycanthropy transformation paths.
- Replace the local discovery bridge with a shared potion discovery/call-name primitive that can express both `makeknown()` and `trycall()`.
- Tighten C status-property mapping for speed, sleep resistance, free action, polymorphed HP loss, and related intrinsics as the shared property model improves.
- Continue replacing local potion identity tables with registry-backed `otyp`, appearance, cost, and magicness metadata.
