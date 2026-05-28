# C Parity Audit 56: Direct Blindness Potionhit

## Purpose

Record the direct hero-thrown potion of blindness slice for `potionhit()` parity.

## Implemented Slice

C routes a hero-thrown potion hit through `potionhit()`: the throw hit gate consumes the attack rolls, `potionhit()` chooses a bottle noun, prints the crash message, may chip one monster HP, prints evaporation, applies the potion effect, then wakes/angers the target and runs adjacent hero vapor.

This slice adds potion of blindness to JS's direct hero-thrown potionhit helper. A direct blindness hit now checks for eyes and permanent blindness, sets `mcansee = false`, adds a capped temporary `mblinded` duration, applies potion-class magic resistance to the bonus duration, and preserves the existing wake/anger and adjacent vapor order. Temporary monster blindness now decrements in the monster-turn tail next to `mfrozen`, restoring `mcansee` when the timeout reaches zero.

The JS implementation evaluates the blindness duration terms in source-textual order: base `64 + rn2(32)`, then the optional `rn2(32)` bonus, then the potion resistance roll. The C expression encodes that formula in one statement; C operand evaluation order is not a portable sequencing guarantee, so this is a source-textual compatibility choice and is pinned by focused RNG tests.

## C Anchors

- `nethack-c/upstream/src/dothrow.c:2262-2265`: hero-thrown potions that hit a monster call `potionhit(mon, obj, POTHIT_HERO_THROW)` and consume the thrown object.
- `nethack-c/upstream/src/potion.c:1625-1681`: `potionhit()` prints bottle crash, optional chip damage, and evaporation before potion-specific effects.
- `nethack-c/upstream/src/potion.c:1821-1829`: `POT_BLINDNESS` only affects monsters with eyes that are not permanently blind, sets `mcansee = 0`, and caps accumulated `mblinded` at 127.
- `nethack-c/upstream/src/potion.c:1897-1909`: hero-thrown hits wake/anger the target and then run adjacent `potionbreathe()`.
- `nethack-c/upstream/src/potion.c:2071-2074`: blindness vapor prints "It suddenly gets dark." for a newly blinded hero and adds `rnd(5)`.
- `nethack-c/upstream/src/mon.c:1201`: monster temporary blindness decrements during monster turn processing and restores sight when it expires.
- `nethack-c/upstream/include/monst.h:253`: `mon_perma_blind(mon)` is `!mcansee && !mblinded`.

## JS Anchors

- `js/cmd.js:12499`: `supportsHeroThrownPotionHit()` now includes `blindness`.
- `js/cmd.js:12547`: `monsterHasEyesForPotionBlindness()` mirrors the local no-eyes fields.
- `js/cmd.js:12552`: `monsterIsPermanentlyBlind()` mirrors the C `mon_perma_blind()` predicate.
- `js/cmd.js:12556`: `blindMonsterFromPotion()` applies the duration, resistance, sight flag, and 127 cap.
- `js/cmd.js:12566`: `heroThrownPotionHitMonster()` runs blindness after crash/evaporation and before wake/anger and adjacent vapor.
- `js/allmain.js:6690`: monster temporary blindness now times out in the monster-turn tail.
- `test/shop-billing-helpers.test.mjs:15885`: focused coverage for successful blindness, resistance, no-eyes/permanent-blind guards, adjacent vapor ordering, `potionIndex`, and monster-turn timeout.

## Follow-Up Findings

Remaining `potionhit()` parity includes unseen `Crash!`, saddle hits, concealed mimic reveal details, bash delivery, non-`kn` `trycall()` prompts, exact visibility/discovery handling, and broader potion families such as healing, sickness, hallucination, speed, invisibility, water, oil, acid, and polymorph. Broader shop-helper work still includes boulder push shop-boundary transitions, shared `sellobj()`, generic `obfree()` preservation, and remaining magic-bag source/target cases.

## Ranking

1. Boulder push shop-boundary transitions and shared `sellobj()`.
2. Remaining direct `potionhit()` monster-effect families from `potion.c`.
3. Generic `obfree()` and ownership consolidation.
4. Remaining magic-bag valuation/source/target cases.
5. Remaining stone-to-flesh object rows, resistance, and beam traversal.
