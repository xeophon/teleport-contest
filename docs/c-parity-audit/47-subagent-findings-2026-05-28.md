# C Parity Audit 47: Direct Thrown Potionhit and Fresh Follow-Ups

## Purpose

This note records the implemented direct hero-thrown potion hit slice and the fresh source-backed follow-up audits run against `nethack-c/upstream`. The code slice is intentionally bounded to potion of confusion and potion of booze delivery because those share the same monster effect (`mconf`) and can reuse the existing vapor/status helpers without pretending the rest of `potionhit()` is complete.

## Implemented Slice

C `thitmonst()` consumes the ordinary projectile `rnd(20)` roll, then gives hero-thrown potions their own hit gate: guaranteed-hit cases or `ACURR(A_DEX) > rnd(25)` call `potionhit(mon, obj, POTHIT_HERO_THROW)` instead of dropping the object to the floor. The implemented JS slice follows that order for supported confusion/booze potions: hit rolls use `rnd(20)` then `rnd(25)`, a hit prints the bottle crash and evaporation messages, may chip one monster HP with `rn2(5)`, applies monster potion resistance at attack level 6, wakes and angers the target, consumes the thrown unit, and leaves no floor object.

Adjacent hero-thrown potion vapor now also uses the direct `potionbreathe()` path after a monster hit. That preserves the C distinction from broken-potion floor effects: direct vapor can affect the hero without the generic "peculiar odor" prelude.

Unsupported potions deliberately fall through to the older noncombat thrown-object path for now. Full `potionhit()` remains broader than this slice: blindness, sleeping, paralysis, hallucination, healing/harming, water/lycanthropy, oil, acid, polymorph, non-`kn` `trycall()` prompts, bash delivery, and exact visibility/discovery handling are still follow-up work.

## C Anchors

- `nethack-c/upstream/src/dothrow.c:2152`: `thitmonst()` consumes the projectile `rnd(20)` roll before the object-specific target handling.
- `nethack-c/upstream/src/dothrow.c:2262-2264`: hero-thrown potions hit with `guaranteed_hit || ACURR(A_DEX) > rnd(25)` and call `potionhit(mon, obj, POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1627`, `nethack-c/upstream/src/potion.c:1493`: `potionhit()` uses `bottlename()`, which consumes `rn2(7)` for the ordinary bottle word.
- `nethack-c/upstream/src/potion.c:1671-1680`: monster hit crash wording, optional `rn2(5)` chip damage, and evaporation wording.
- `nethack-c/upstream/src/potion.c:1778-1781`: confusion and booze potions test potion resistance and set `mconf` on failure.
- `nethack-c/upstream/src/zap.c:6124-6141`: potion resistance uses attack level 6 and `rn2(100 + alev - dlev) < mr`.
- `nethack-c/upstream/src/potion.c:1907`: adjacent direct vapor chance uses `!rn2((1 + ACURR(A_DEX)) / 2)` before `potionbreathe()`.

## JS Notes

- `js/cmd.js`: `throwDirection` now builds the single thrown object before target handling so the hit path can split shop bill rows and consume exactly the thrown unit.
- `js/cmd.js`: `supportsHeroThrownPotionHit()` gates the new direct-hit delivery to confusion/booze potions; other potion types keep the previous landing behavior until their effects are ported.
- `js/cmd.js`: `heroThrownPotionHitMonster()` emits the C-shaped crash/evaporation messages, performs chip damage, calls shared `monsterResistsEffect(mon, 6)`, wakes/angers the target, handles adjacent direct vapor, and converts unpaid thrown units into used-up debt.
- `test/shop-billing-helpers.test.mjs`: source-derived tests cover a known confusion potion hitting a visible monster and an adjacent direct-vapor hit, including the expected RNG call order.

## Fresh Follow-Up Findings

### Statue Shatter Debt

C `animate_statue()` deletes the trap, creates the monster, builds the shatter/animation message, charges `stolen_value()` for a costly statue and contents before moving contents to monster inventory, appends the debt line after "Instead of shattering...", then removes the statue. JS `activateStatueTrap()` still moves contents and removes the statue without that debt step. The compact next slice is `activateStatueTrap(..., { shatter: true })` only; normal/search activation should stay free.

Relevant C anchors: `nethack-c/upstream/src/trap.c:713`, `nethack-c/upstream/src/trap.c:854-890`, `nethack-c/upstream/src/trap.c:923-925`, `nethack-c/upstream/src/shk.c:3712`, `nethack-c/upstream/src/shk.c:3818`, and `nethack-c/upstream/src/shk.c:3845`.

### Stone To Flesh Rescue

C self-cast stone to flesh rescues the hero from stoning and turns stone-golem polyself into flesh-golem polyself before object transformations continue. Current JS self-cast stone to flesh only covers the carried marble-wand transform. The compact next slice is to clear `_stonedTimeout`, `_stonedKiller`, and the `Stone` suffix with "You feel limber!", plus convert `_polyself_form.name === 'stone golem'` to flesh golem.

Relevant C anchors: `nethack-c/upstream/src/spell.c:1478`, `nethack-c/upstream/src/spell.c:1500`, `nethack-c/upstream/src/zap.c:2966-2990`, `nethack-c/upstream/src/eat.c:867`, `nethack-c/upstream/include/youprop.h:109`, and `nethack-c/upstream/include/you.h:554`.

### Remaining Forced-Chest Gaps

The forced chest-content potion shatter slice is complete for direct vapor and stack survivors, but three C-visible gaps remain: blade breakage during long forcing, blunt forcing wake-nearby behavior, and material-specific non-potion `chest_shatter_msg()` wording.

### Plan Hygiene

`PORTING_PLAN.md` had accumulated detailed completed-work history already covered by the audit files. It should stay focused on current priorities: shared shop ownership helpers, remaining `potionhit()` delivery, statue shatter debt, stone-to-flesh rescue, forced-chest leftovers, and registry/factory consolidation.

## Ranking

1. Statue shatter shop debt is now the smallest visible shop-loss follow-up and can reuse the chest-content loss helper shape.
2. Stone-to-flesh stoning/polyself rescue is a compact runtime/status slice before broader object material transforms.
3. Broaden direct `potionhit()` one potion family at a time, starting with effects already represented by existing status helpers.
4. Generic `stolen_value()`/`obfree()` consolidation should follow another concrete caller so it stays grounded in observed transfer semantics.
