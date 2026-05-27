# C Parity Audit 38: Hard-Landing Broken Potion Vapors

## Scope

This slice extends the bounded vapor helper from Audit 37 to top-level hard-landing projectile potion breakage. When a potion projectile breaks on a hard square next to the hero, JS now delivers C-style broken-potion vapor before shop debt conversion and before the object is discarded. The modeled branch adds the generic broken-potion smell or eye-watering message, wet towel shielding, and the existing vapor effects and `kn` discovery behavior.

This is not full `potionhit()` parity. Direct potion hits on the hero or monsters, wielded-potion bash, tossed-up head/ceiling cases, kicked objects, chest-content shattering, inventory fire/zap destruction, and non-`kn` `trycall()` prompting remain separate work. Impact-drop arrival with the hero is covered in Audit 39.

## C Source Anchors

- `nethack-c/upstream/src/dothrow.c:2416-2435`: `hero_breaks()` runs break testing, emits the break message, then calls `breakobj()` for hero-caused thrown/dropped/kicked breakage.
- `nethack-c/upstream/src/dothrow.c:2480-2520`: `breakobj()` treats every potion as the potion branch, marks it in use, delivers nearby vapor for non-lit-oil potions before shop handling, and leaves monster breathing unimplemented.
- `nethack-c/upstream/src/dothrow.c:2502-2517`: broken potion vapor uses `next2u(x, y)` with no Dex RNG; non-water non-towel vapors first print `You smell a peculiar odor...` or eye-watering feedback, then call `potionbreathe(obj)`.
- `nethack-c/upstream/src/dothrow.c:2542-2581`: shop handling and object deletion happen after break side effects, and `breaktest()` uses object resistance before confirming breakage.
- `nethack-c/upstream/src/potion.c:1930-2118`: `potionbreathe()` owns vapor side effects and the `dknown` split between `makeknown()` for `kn` cases and `trycall()` otherwise.
- `nethack-c/upstream/src/potion.c:1906-1911`: direct `potionhit()` has a different vapor gate with same-square automatic delivery, adjacent Dex-based delivery, and fallback `trycall()` when vapor does not land.

## JS Implementation Notes

- `js/cmd.js:12142-12155`: added `brokenPotionBreathe()` for C `breakobj()`-style vapor: adjacent/same-square gate, generic odor or eye-watering message, towel shielding, and delegation to `potionBreathe()`.
- `js/cmd.js:18717-18731`: hard-landing top-level projectile breakage now calls `brokenPotionBreathe()` after the break message and before `convertUnpaidObjectToShopDebt()`, preserving C's side-effects-before-shop order.
- `test/shop-billing-helpers.test.mjs:14307-14354`: focused tests cover adjacent confusion vapor, wet worn towel shielding, and known blindness vapor discovery from a hard-landing broken potion.

## Follow-Ups

- Add direct `potionhit()` handling for thrown potions striking the hero or monsters, including distance/Dex vapor gating and monster potion effects.
- Add non-`kn` `trycall()` prompting once potion call-name discovery can represent C `oc_uname` semantics.
- Audit 39 covers impact-drop arrival with the hero present; remaining `breakobj()`-like callers with clear semantics include chest-content potion shattering, hot-ground breakage, and inventory fire destruction.
- Keep migration-preflight breakage without vapor where C uses `obfree()` before migration instead of `breaks()`.
