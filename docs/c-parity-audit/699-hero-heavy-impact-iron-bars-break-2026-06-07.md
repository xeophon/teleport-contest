# Hero Heavy Impact Iron Bars Break

## C Source

- `nethack-c/upstream/src/zap.c:3900-3912` routes hero horizontal thrown and kicked weapons through `hits_bars(... point_blank ? 0 : !rn2(5), 1)`, backing the projectile up to the pre-bars square when bars are hit.
- `nethack-c/upstream/src/mthrowu.c:1417-1495` handles iron-bars impacts, including the sound, wake noise, and the hero-caused war-hammer / heavy-iron-ball bars break chance.
- `nethack-c/upstream/src/mthrowu.c:1473-1488` computes the non-melee break chance as `60 - acurrstr() - spe`, where heavy iron balls use `owt / WT_IRON_BALL_INCR`; success prints `You break the bars apart!` and calls `dissolve_bars()`.
- `nethack-c/upstream/src/monmove.c:2170-2175` dissolves bars into door, room, or corridor terrain and clears the terrain flags.
- `nethack-c/upstream/src/dothrow.c:1780-1793` can still run the ordinary hard-landing break test after a surviving object stops before bars.

## JS Gap

Hero-thrown nonbreaking iron-bars impacts emitted the C sound and then landed, but did not run the follow-up C chance for thrown war hammers or heavy iron balls to break the bars apart. Textual `iron ball` aliases also did not consistently share the heavy-iron-ball behavior when no concrete `otyp` was present.

## Change

- Added a shared heavy-iron-ball predicate for concrete and textual `heavy iron ball` / `iron ball` projectiles.
- Added the C-shaped war-hammer / heavy-iron-ball bars break chance after the nonbreaking impact sound and before the later landing break test.
- Added bars terrain mutation shaped like C `dissolve_bars()`, clearing the bars cell back to door, room, or corridor terrain.
- Preserved the existing C RNG order: force-hit roll, impact break test, heavy-impact bars-break roll, then surviving-object landing break test.

## Coverage

- `hero-thrown war hammer can break iron bars apart before landing`
- `hero-thrown heavy iron ball whangs and breaks nondiggable iron bars`
- `hero-thrown war hammer breaks edge iron bars into a door`

## Remaining

- Boulder `Whang!` canary for hero-thrown bars hits.
- Silver/gold `Clink!` canaries for hero-thrown bars hits.
- Point-blank iron-bars canaries for hit-class and pass-through projectiles.
- Forced bars-hit multishot mixes where later projectiles continue after an earlier stopped projectile.
