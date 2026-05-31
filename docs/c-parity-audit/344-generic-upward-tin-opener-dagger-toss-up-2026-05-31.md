# C-Parity Audit 344 - Generic Upward Tin Opener and Dagger Toss-Up

## Implemented Slice

Covered a narrow generic non-potion `toss_up()` path for hero-thrown plain tin openers and clean +0 plain daggers thrown upward.

## C Source

- `nethack-c/upstream/src/dothrow.c:1510-1599`: upward hero throws route through `toss_up(obj, rn2(5) && !Underwater)`.
- `nethack-c/upstream/src/dothrow.c:1256-1285`: `toss_up()` chooses `flies up into`, `hits`, or `almost hits`, with an optional roof `breaktest()` before fall-back self-hit wording.
- `nethack-c/upstream/src/dothrow.c:1289-1380`: non-potion, non-breakable, non-harmless self-hits use `dmgval()` first, then weight fallback, hard-helmet reduction, `u.udaminc`, and `Maybe_Half_Phys()`.
- `nethack-c/upstream/src/dothrow.c:1374-1397`: hard helmets print the protection message when they reduce or block the effective hit; soft headgear reports that it does not protect.
- `nethack-c/upstream/src/dothrow.c:1420-1423`: surviving damaging objects call `hitfloor(obj, TRUE)` before HP loss.
- `nethack-c/upstream/src/dothrow.c:603-647`: `hitfloor()` reports the floor hit, runs `hero_breaks()`, `ship_object()`, and then drops/stacks the object.
- `nethack-c/upstream/src/dothrow.c:2582-2608` and `nethack-c/upstream/src/zap.c:1458-1472`: `breaktest()` still consumes `obj_resists()` `rn2(100)` before deciding tin openers and daggers do not break.
- `nethack-c/upstream/src/weapon.c:216-355`: `dmgval()` gives a plain dagger `rnd(4)` damage against a normal-size hero.
- `nethack-c/upstream/include/objects.h:200-202`: dagger small-target damage is 4.
- `nethack-c/upstream/include/objects.h:961-962`: tin opener is an iron tool with weight 4 and no weapon damage.

## JS Behavior

- `js/cmd.js`: added a generic upward damaging-object branch before command-assist fallback for plain tin openers and clean +0 plain daggers.
- `js/cmd.js`: preserves C RNG order for roof `rn2(5)`, roof/self/floor `breaktest()` `rn2(100)` calls, dagger `rnd(4)`, and stack split `rnd(2)` where applicable.
- `js/cmd.js`: computes tin opener fallback damage from weight, dagger damage from the C small-target dagger roll, applies hard-helmet cap, lands the object before fatal damage, and keeps same-shop unpaid projectile return behavior.

## Regression Coverage

- `upward hero-thrown tin opener self-hits, damages, and lands`
- `upward hero-thrown plain dagger self-hits, damages, and lands`
- `upward hero-thrown plain dagger hard helmet caps falling damage`
- `upward hero-thrown unpaid dagger stack returns one unit to shop floor`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'upward hero-thrown (tin opener|plain dagger|unpaid dagger stack)' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`

## Deferred

- Broader generic upward impacts remain incomplete: blessed/silver/material bonuses, artifacts, eroded or enchanted weapons, big or unusual polyself forms, shade/xorn harmless paths, returning weapons, soft floors, water/swallowing, altars, downward migration, and broader object classes.
