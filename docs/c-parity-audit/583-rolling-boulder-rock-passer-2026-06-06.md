# Rolling Boulder Rock-Passer Harmless Hits

## Scope

Cover the C `ohitmon()` rock-passer branch for monster-triggered rolling boulder traps: a stone boulder that hits a rock-passing monster consumes the normal hit and damage rolls, reports the harmless pass-through message when visible, leaves the monster unharmed, and keeps rolling.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/trap.c:3395` through `:3409` rolls a launched boulder through monsters, offers rock throwers a `rn2(3)` snatch chance first, then calls `ohitmon()` with `range = -1` for rolling boulders.
- `nethack-c/upstream/src/mthrowu.c:340` through `:357` performs the monster hit roll: `5 + find_mac(mtmp) + omon_adj(...)` against `rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:371` through `:394` computes `harmless = stone_missile(otmp) && passes_rocks(mtmp->data)`, still calls `dmgval()`, and emits the visible harmless hit suffix.
- `nethack-c/upstream/src/mthrowu.c:444` through `:500` applies HP damage only when `!harmless`; for rolling boulders with `range == -1`, `drop_throw()` is undone so the boulder continues in motion.
- `nethack-c/upstream/include/obj.h:274` defines stone missiles as gemstone or mineral non-ring objects.
- `nethack-c/upstream/include/mondata.h:205` defines `passes_rocks()` as wall-passing and not unsolid.

## JS Change

- `js/allmain.js` now reuses the existing `monsterPassesRocks()` predicate inside `monsterRollingBoulderTrapEffect()`.
- A successful rolling-boulder hit against a rock-passing monster still consumes the boulder `rnd(20)` damage roll and wakes the target, but skips HP damage, kill cleanup, and pet post-move death cleanup.
- Visible harmless hits queue `The boulder hits <monster> but passes harmlessly through it.`
- The boulder remains in motion and is placed at the normal final launch square after passing through the monster.

## Tests

- `rolling boulder passes harmlessly through rock-passing monster after hit roll`
- `rolling boulder miss against rock-passer stays a miss without damage roll`

The tests use local trap, boulder, monster, visibility, and RNG fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Full `launch_obj()` parity remains broader trap/terrain work: path trap effects, launch-drop preservation, and floor-effect integration. Unseen rolling-boulder launch feedback is covered in audit 584, door breakage is covered in audit 585, rock-thrower snatch feedback is covered in audit 586, iron-bars handling is covered in audit 587, boulder chaining is covered in audit 588, and hero collision along the rolling path is covered in audit 589.
