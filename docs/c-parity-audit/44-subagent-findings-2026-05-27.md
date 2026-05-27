# C Parity Audit 44: Fresh Chest, Stone, Potionhit, and Statue Follow-Ups

## Purpose

This note records the fresh read-only subagent findings gathered while implementing Audit 43. The implemented code slice in this turn is gremlin-only water vapor; the candidates below remain open, ranked by locality and source confidence.

## Forced Chest-Content Potion Shattering

- C `forcelock()` calls `breakchestlock(box, !picktyp && !rn2(3))`, so blade forcing does not consume the destroy roll while blunt forcing does (`nethack-c/upstream/src/lock.c:247-252`).
- Destroying `breakchestlock()` extracts each contained object, consumes one `rn2(3)` per content object, destroys on that roll or always for potions, calls `chest_shatter_msg()` before shop loss, then destroys exactly one unit with `obfree()` or `useup()` (`nethack-c/upstream/src/lock.c:182-204`, `nethack-c/upstream/src/invent.c:1325`).
- Potion chest shatter prints `You see/hear a <bottle> shatter!` and calls direct `potionbreathe()` with no broken-potion odor prelude (`nethack-c/upstream/src/lock.c:1282-1285`).
- C charges destroyed contents silently before stack decrement, then the destroyed box, then prints one aggregate destroyed-objects debt line (`nethack-c/upstream/src/lock.c:188-206`, `nethack-c/upstream/src/shk.c:3753-3818`).
- JS still consumes the destroy roll even for `picktyp`, snapshots/removes all contents, gives destroyed potions generic torn-to-shreds wording, loses full potion stacks, clones survivors, and has no destroyed-content/box debt conversion (`js/cmd.js:9013-9034`, `js/cmd.js:36657-36683`).
- Smallest safe slice: fix the blade destroy-roll short-circuit, add chest-specific potion shatter wording plus direct `potionBreathe()`, destroy one potion from stacks, place/stack live survivors, and then add a narrow destroyed-objects shop-loss accumulator.

## Stone To Flesh Marble Wand

- C self-cast `SPE_STONE_TO_FLESH` routes through `zapyourself()`, walks inventory through `bhito()`, and restarts inventory merges until stable (`nethack-c/upstream/src/spell.c:1478-1500`, `nethack-c/upstream/src/zap.c:2966-2990`).
- `stone_to_flesh_obj()` gates on mineral/gemstone material; mineral `WAND_CLASS` maps to `MEAT_STICK`, and the marble wand of make invisible is the ordinary mineral wand row (`nethack-c/upstream/src/zap.c:2002-2080`, `nethack-c/upstream/include/objects.h:1466`).
- C `poly_obj()` preserves quantity, inventory letter, `no_charge`, BUC, and `recharged` while dropping wand charge metadata; deleting an unpaid old wand leaves the old bill row used-up (`nethack-c/upstream/src/zap.c:1702-1903`, `nethack-c/upstream/src/zap.c:1987`, `nethack-c/upstream/src/shk.c:1224`).
- JS still classifies the spell as healing and hardcodes healing pseudo-object handling, so self-cast stone to flesh heals instead of transforming inventory (`js/cmd.js:1045`, `js/cmd.js:39695-39703`).
- Smallest safe slice: before the generic healing branch, handle self-cast stone to flesh for carried marble/make-invisible wands only, replace each with `MEAT_STICK`, preserve C fields, mark old unpaid rows used-up, and run a post-scan meat-stick merge pass.

## Direct Hero-Thrown Potionhit

- C removes/splits the thrown object before flight, consumes the ordinary `rnd(20)` hit roll, then potions hit on `ACURR(A_DEX) > rnd(25)` and call `potionhit()` directly (`nethack-c/upstream/src/dothrow.c:257`, `nethack-c/upstream/src/dothrow.c:2152-2264`).
- On visible confusion-potion hit, C prints the bottle crash/shards message, may chip 1 HP on `rn2(5)`, evaporates the potion, sets `mconf` unless potion resistance succeeds at attack level 6, wakes/angers surviving targets, and frees the object (`nethack-c/upstream/src/potion.c:1653-1927`, `nethack-c/upstream/src/zap.c:6124`).
- Misses still route through `tmiss()` and landing/breakage (`nethack-c/upstream/src/dothrow.c:1951-2300`).
- JS currently routes hero-thrown potions through the generic non-combat miss/landing path, so direct hits never occur and floor breakage uses `brokenPotionBreathe()` instead of `potionhit()` vapor/trycall ordering (`js/cmd.js:48154-48224`, `js/cmd.js:18729`, `js/cmd.js:12164`).
- Smallest safe slice: implement only a known hero-thrown potion of confusion hitting a visible ordinary non-shop monster at range 2+, with C hit rolls, no floor landing on hit, crash/evaporation messages, `mconf`, and miss path preserved.

## Statue Trap Shatter Shop Debt

- C `animate_statue()` creates the monster and prints the animation message, calls `stolen_value()` while the statue still owns its contents, then moves contents to monster inventory and deletes the statue (`nethack-c/upstream/src/trap.c:713-880`).
- `stolen_value()` removes bill rows, includes contents and contained gold, and routes value to credit/debit/robbed based on shopkeeper state (`nethack-c/upstream/src/shk.c:1082`, `nethack-c/upstream/src/shk.c:3712-3818`).
- JS `activateStatueTrap()` builds the message, moves contents to the new monster, and removes the statue with no shop-debt step (`js/cmd.js:14268-14301`).
- Smallest safe slice: for `activateStatueTrap(..., { shatter: true })` only, after message construction and before moving contents, require a tended costly spot and `!statue.no_charge`, value the statue/contents with lost-merchandise helpers, and charge with shopkeeper-peacefulness rather than hero-location peace.

## Ranking

1. Forced chest-content potion shattering is the closest continuation of the potion vapor work and has precise tests.
2. Statue trap shatter debt is compact and isolated in one trap path.
3. Stone to flesh is a high-value object-transform slice but touches spell dispatch and inventory merging.
4. Direct hero-thrown `potionhit()` is high impact but should start with one monster-hit row before broadening.
