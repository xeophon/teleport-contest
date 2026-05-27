# C Parity Audit 42: Fresh Vapor, Potionhit, Transform, and Statue Follow-Ups

## Purpose

This note records the fresh read-only subagent audits run after the hot-ground and inventory-fire vapor work. Audit 41 implements inventory-fire direct `potionbreathe()`, and Audit 43 implements gremlin-only water vapor splitting; the remaining findings below are source-backed candidates for later slices.

## Forced Chest-Content Potion Shattering

- C `forcelock()` calls `breakchestlock(box, !picktyp && !rn2(3))`, so blade forcing does not consume the destroy roll (`nethack-c/upstream/src/lock.c:252`).
- C `breakchestlock()` extracts each live contained object, rolls once per content object, always destroys potions after that roll, emits `chest_shatter_msg()`, and destroys one unit from a stack before placing survivors at the hero and stacking them (`nethack-c/upstream/src/lock.c:162-204`).
- C `chest_shatter_msg()` prints `You see/hear a <bottle> shatter!` for potions and calls direct `potionbreathe()` without the broken-potion odor prelude (`nethack-c/upstream/src/lock.c:1276-1285`).
- JS currently snapshots and removes all chest contents in `finishForceLock()`, then the delayed content loop gives potions the generic torn-to-shreds message, loses full stacks, clones survivors, and consumes an extra survivor `rn2(100)` (`js/cmd.js:9010-9035`, `js/cmd.js:36654-36684`).
- Audit 46 implements this slice: blade forcing now skips the destroy roll in helper and command paths, forced chest potion contents use chest-specific bottle wording plus direct `potionBreathe()`, one potion stack unit is destroyed, survivors are placed/stacked at the hero, and destroyed shop contents plus the box produce post-credit aggregate debt.
- Remaining forced-chest work is blade weapon breakage, blunt wake-nearby occupation behavior, and material-specific non-potion shatter wording.

## Direct Potionhit Delivery

- C `potionhit()` is the shared direct-delivery subsystem for hero-thrown potion hits, wielded potion bashes, monster-thrown hero hits, monster target effects, saddle hits, evaporation, nearby hero vapor, shop billing, and final object cleanup (`nethack-c/upstream/src/potion.c:1623-1928`).
- C callers include hero-thrown hits from `dothrow.c:2262-2265`, wielded potion bash from `uhitm.c:1094-1116`, monster projectile hits from `mthrowu.c:134`, `mthrowu.c:361`, and `mthrowu.c:698`, and acid-through-bars handling from `mthrowu.c:1416-1444`.
- JS currently routes hero-thrown potions through non-combat landing behavior, models hard landing breakage with `brokenPotionBreathe()`, and has a bespoke monster-thrown hero potion path that only covers a small effect subset (`js/cmd.js:48139-48185`, `js/cmd.js:18722-18730`, `js/allmain.js:6331-6365`, `js/cmd.js:35394-35416`).
- This is a larger subsystem slice than chest shatter or water vapor. Start with hero-thrown potion of confusion hitting an adjacent monster and wielded potion bash stack splitting before broadening the direct monster effect matrix.

## Water Vapor Gremlin Split

- C `potionbreathe()` handles `POT_WATER` by splitting the hero only when `u.umonnum == PM_GREMLIN`; lycanthropy is a separate `else if` branch (`nethack-c/upstream/src/potion.c:2080`).
- The wet worn towel gate happens before potion-specific effects, so it blocks water vapor splitting too (`nethack-c/upstream/src/potion.c:1943`, `nethack-c/upstream/include/youprop.h:405`).
- C gremlin split uses polyform HP through `split_mon(&youmonst)` and `cloneu()`, creating a tame named gremlin clone and splitting current/max monster-form HP (`nethack-c/upstream/src/mhitu.c:2615-2630`).
- Audit 43 adds the gremlin-only JS water case using current JS poly HP fields, an adjacent tame named gremlin clone, odd HP split toward the hero, and wet towel shielding across direct and broken-potion vapor callers. Lycanthropy remains deferred (`js/cmd.js:12051-12195`, `test/shop-billing-helpers.test.mjs:2998-3062`, `test/shop-billing-helpers.test.mjs:14473-14499`).

## Stone To Flesh

- C spell dispatch routes the actual `SPE_STONE_TO_FLESH` pseudo object through wand-style directional handling (`nethack-c/upstream/src/spell.c:1400-1513`).
- Self-cast stone to flesh walks every inventory object through `bhito()`, then repeatedly merges compatible non-worn inventory (`nethack-c/upstream/src/zap.c:2966-2990`).
- `stone_to_flesh_obj()` gates on mineral or gemstone material, applies `obj_resists(obj, 2, 98)`, and maps mineral wands to `MEAT_STICK`; the ordinary mineral wand row is the marble wand of make invisible (`nethack-c/upstream/src/zap.c:2002-2084`, `nethack-c/upstream/include/objects.h:1466`).
- Audit 45 covers this first JS slice: self-cast known stone to flesh on a carried marble wand of make invisible now transforms it to `MEAT_STICK`, preserves quantity/BUC/letter/no-charge/recharged where local metadata allows, merges compatible inventory meat sticks, and preserves unpaid carried wand debt as a used-up row.
- Remaining stone-to-flesh work is broader object-transform parity: rings, gems/stones, boulders, statues, figurines, floor/beam targets, golem effects, petrification rescue, and registry-backed material/object metadata.

## Statue Trap Shatter Shop Debt

- C `animate_statue()` charges `stolen_value()` for hero-caused non-normal statue animation before moving statue contents to the monster (`nethack-c/upstream/src/trap.c:713-880`, `nethack-c/upstream/src/shk.c:3712-3830`).
- JS `activateStatueTrap()` composes the animation message and then moves contents to the monster with no debt conversion (`js/cmd.js:14212-14245`, `js/cmd.js:14020`).
- Smallest next slice: when `shatter === true`, the statue is not `no_charge`, and the statue spot is a tended shop spot, charge lost shop value before `moveStatueContentsToMonster()`. Keep normal/search/step/sit activation uncharged.

## Ranking

1. Direct `potionhit()` is high impact but should be split into smaller hit-delivery rows.
2. Statue shatter shop debt is a compact non-potion shop-debt slice.
3. Broader stone to flesh remains useful after Audit 45, but it should follow registry-backed material/object metadata.
4. Remaining forced-chest occupation/material details can follow after higher-impact visible delivery/debt rows.
