# C Parity Audit 49: Stone-To-Flesh Rescue

## Purpose

This note records the implemented self-cast stone-to-flesh rescue slice and the fresh follow-up audits. The code change is intentionally narrow: it extends the existing self-cast inventory transform path with C-order hero rescue before broader floor, beam, statue, figurine, ring, gem, and boulder transformations.

## Implemented Slice

C routes `SPE_STONE_TO_FLESH` through the wand-like spell direction path. When cast at self, `zapyourself()` first converts a stone-golem hero form into a flesh golem, then clears active stoning through `fix_petrification()`, then walks inventory through `bhito()`, and finally repeats inventory merge passes until no compatible transformed items remain.

JS now follows that ordering in the covered self-cast path. A stone-golem polyself becomes a flesh golem before inventory transforms using the C fixed golem HP/AC row, active `_stonedTimeout` is cleared, `_stonedKiller` is removed, the `Stone` status suffix is removed, and the C `fix_petrification()` message is returned, including the hallucinated art variant. The existing carried marble-wand-to-meat-stick transform and repeated merge pass still run afterward, preserving the previous shop billing and smell-message coverage.

## C Anchors

- `nethack-c/upstream/src/spell.c:1478-1513`: stone to flesh is an immediate wand-like spell; self direction calls `zapyourself()` and then updates inventory.
- `nethack-c/upstream/src/zap.c:2966-2990`: self-cast stone to flesh converts stone-golem polyself, fixes petrification, walks inventory through `bhito()`, and repeatedly merges results.
- `nethack-c/upstream/src/zap.c:1993-2110`: `stone_to_flesh_obj()` gates mineral/gemstone material, converts the marble wand row to `MEAT_STICK`, and emits the meat smell after conversion.
- `nethack-c/upstream/src/eat.c:867-876`: `fix_petrification()` clears stoning with "You feel limber!" or a hallucinated art message.
- `nethack-c/upstream/src/potion.c:222-237`: `make_stoned(0L, ...)` only prints when the stoning state toggles and clears the delayed killer when stoning ends.
- `nethack-c/upstream/include/monsters.h:2552-2582`: flesh golem and stone golem monster rows supply C AC, level, speed, and resistance data.
- `nethack-c/upstream/src/makemon.c:2233-2254`: `golemhp()` gives fixed golem HP, including 40 for flesh golems and 100 for stone golems.
- `nethack-c/upstream/src/polyself.c:798-835`: broader `polymon()` still has stone-related rescue semantics, including the `poly_when_stoned()` stone-golem branch and stone-resistance clearing message.

## JS Notes

- `js/cmd.js`: `fixHeroPetrification()` is now the shared JS helper for clearing active hero stoning and preserving the C message shape.
- `js/cmd.js`: the local polyself form table now has a flesh golem row so the stone-to-flesh rescue does not fall back to random `d(9,8)` HP or default AC.
- `js/cmd.js`: `stoneToFleshInventoryEffect()` now performs stone-golem polyself conversion and active stoning rescue before the existing inventory transform loop.
- `js/cmd.js`: the acidic-food petrification rescue now delegates to the shared helper instead of duplicating status cleanup.
- `test/shop-billing-helpers.test.mjs`: focused tests cover active stoning rescue, hallucinated rescue wording, rescue before carried wand transformation, and stone-golem polyself conversion with fixed flesh-golem HP/AC.

## Fresh Follow-Up Findings

### Direct Potionhit: Paralysis

The next compact `potionhit()` family is direct hero-thrown potion of paralysis. The C order is hit roll, direct-hit gate, `bottlename()` RNG, crash message, possible chip damage, evaporation message, then `rnd(25)` paralysis duration when `mon->mcanmove` is true. There is no monster-resistance roll for paralysis. JS should set `mon.mcanmove = false` and `mon.mfrozen` from the C duration, leaving the existing monster frozen lifecycle to restore movement.

Relevant anchors: `nethack-c/upstream/src/dothrow.c:2152`, `nethack-c/upstream/src/dothrow.c:2262-2264`, `nethack-c/upstream/src/potion.c:1627`, `nethack-c/upstream/src/potion.c:1809`, `nethack-c/upstream/src/mhitm.c:1209-1216`, and `nethack-c/upstream/src/mon.c:1200`.

### Shop Helper Consolidation

Burying merchandise is the cleanest next `stolen_value()` consolidation caller. C `bury_objs()` sums `stolen_value()` for each floor object, marks buried non-gold objects `no_charge`, and emits one debt line for burying merchandise. Current JS still has local price-summing for burial instead of the shared lost-merchandise path. Floor polymorph and floor stone-to-flesh costly alteration remain important but wider because they combine replacement behavior, same-shop dummy billing, and out-of-shop lost-merchandise debt.

Relevant anchors: `nethack-c/upstream/src/dig.c:2050-2079` and `nethack-c/upstream/src/shk.c:3754-3855`.

### Broader Stone To Flesh

The current slice does not implement full `stone_to_flesh_obj()` coverage. Remaining source-backed targets include rings, gems/stones, boulders, statues, figurines, floor/beam targets, material registry integration, object resistance, attached data cleanup, and shop routing for non-inventory transformations.

The broader `polymon()` stoning interaction also remains open: C can redirect some stoned polymorphs through stone-golem form and clear stoning with "You turn to stone!" before later stone-resistance cleanup.

### Forced Chest Details

Forced chest-content potion shatter is covered, but blade breakage during long forcing, blunt wake-nearby behavior, and material-specific non-potion shatter wording are still valid source-backed follow-ups.

## Ranking

1. Direct hero-thrown potion of paralysis is the next bounded `potionhit()` family.
2. Burying merchandise is the smallest next shared `stolen_value()`/`subfrombill()` consolidation slice.
3. Floor polymorph and floor stone-to-flesh costly alteration should follow once the floor lost-merchandise helper shape is settled.
4. Broader stone-to-flesh object coverage and generic `polymon()` stoning semantics remain larger registry/combat-runtime follow-ups.
