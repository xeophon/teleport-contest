# Hero Iron Bars Impact Sounds

## C Source

- `nethack-c/upstream/src/mthrowu.c:1417-1495` handles nonbreaking iron-bars impacts after breakage checks.
- `nethack-c/upstream/src/mthrowu.c:1447-1468` chooses `Whang`, `Whap`, `Flapp`, `Clink`, or `Clonk` in that order.
- `nethack-c/upstream/src/dothrow.c:1220-1233` defines the harmless-missile list used for `Whap`.
- `nethack-c/upstream/include/obj.h:418-420` defines flimsy objects by low material values or rubber hose for `Flapp`.

## JS Gap

Hero-thrown nonbreaking iron-bars impacts used `Whang`, `Clink`, or fallback `Clonk`, but skipped C's harmless `Whap` and flimsy `Flapp` classes.

## Change

- Added a harmless-missile predicate for supported C names such as sling, eucalyptus leaf, kelp frond, sprig of wolfsbane, fortune cookie, pancake, and low-charge rubber hose / bag of tricks.
- Added a conservative flimsy predicate for low-material strings and common flimsy object names.
- Preserved C sound precedence: heavy object, harmless, flimsy, coin/gold/silver, fallback.

## Coverage

- `hero-thrown sling whaps iron bars before landing`
- `hero-thrown cloth armor flapps iron bars before landing`

## Remaining

- Hero-thrown `Whang!` for boulders/heavy iron balls.
- Silver/gold `Clink!` canaries for hero-thrown bars hits.
- Forced bars-hit multishot mixes where later projectiles continue after an earlier `Whap`/`Flapp`.
