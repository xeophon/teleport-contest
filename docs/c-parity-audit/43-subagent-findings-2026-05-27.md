# C Parity Audit 43: Gremlin Water Vapor

## Purpose

This note records the implemented gremlin-only water vapor slice. Audit 42 identified `POT_WATER` vapor as a compact follow-up after the broader broken-potion vapor work; this slice ports the C gremlin polyself branch while leaving lycanthropy water vapor transformations for a later pass.

## C Behavior

- `potionbreathe()` first applies the wet worn towel gate through `Half_gas_damage`, printing `Some vapor passes harmlessly around you.` and skipping potion-specific effects (`nethack-c/upstream/src/potion.c:1943-1949`, `nethack-c/upstream/include/youprop.h:405`).
- The `POT_WATER` branch splits only a gremlin-form hero. Lycanthropy is a separate `else if` branch and remains intentionally separate (`nethack-c/upstream/src/potion.c:2080-2090`).
- `split_mon(&youmonst, 0)` routes hero splitting through `cloneu()`, leaves odd current HP with the original hero, halves max HP the same way, and prints `You multiply!` when a clone is created (`nethack-c/upstream/src/potion.c:2873-2898`).
- `cloneu()` creates the clone from the current polyself monster data at the hero position with `NO_MINVENT | MM_EDOG | MM_NOMSG`, marks it cloned, names it after the player, initializes it as a tame pet, and starts it at half the hero's current monster-form HP (`nethack-c/upstream/src/mhitu.c:2616-2637`).

## JS Implementation

- `potionBreathe()` now has a `water` case after the existing wet towel guard, so water vapor effects share the same broken/direct vapor callers as the other potion effects (`js/cmd.js:12097-12195`).
- `splitGremlinPolyselfFromWaterVapor()` checks only gremlin polyself, uses the current JS poly HP fields `u.uhp` and `u.uhpmax`, places a clone with `enextoMonsterSpot()`, splits odd current and max HP toward the hero, creates a tame named cloned gremlin, initializes its pet extension, records pet conduct, and appends `You multiply!` (`js/cmd.js:12051-12095`).
- The focused tests drive the path through inventory-fire direct vapor and hard-landing broken-potion vapor, assert no broken-potion odor prelude for water, verify hero and clone HP split as 7/11 to 4/6 plus 3/5, and verify wet towels block the split while preserving HP (`test/shop-billing-helpers.test.mjs:2998-3062`, `test/shop-billing-helpers.test.mjs:14473-14499`).

## Remaining Follow-Ups

- C lycanthropy water vapor transformation is still open: blessed water can revert a matching were-form, and cursed water can trigger `you_were()` when not polyself.
- Other broken-potion callers still need coverage, especially forced chest-content potion shatter with direct `potionbreathe()` and chest-specific shatter wording.
- Direct `potionhit()` delivery remains a larger subsystem: hero-thrown potion hits, wielded potion bashes, monster-thrown hero hits, and acid-through-bars should be split into smaller rows.
