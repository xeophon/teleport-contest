# Mounted Hero Bear Trap

## Scope

Port the C hero `BEAR_TRAP` floor-trigger path far enough to cover ordinary movement, `#sit`, mounted steed damage, and the object-list/dismount pending routes. Before this slice, JS had a narrow hero-only bear-trap path for object-list continuation and `#sit`, and mounted heroes could take the trap effect instead of routing the damage through their steed.

No replay maps, hidden tests, seeds, player names, or runtime shortcuts are used.

## C Reference

- `nethack-c/upstream/src/trap.c:1479` through `:1524` is the hero `trapeffect_bear_trap()` body.
- `nethack-c/upstream/src/trap.c:1490` rolls `d(2,4)` before the bear-trap branch resolves.
- `nethack-c/upstream/src/trap.c:1494` marks the trap seen via `feeltrap(trap)` after the levitation/flying skip.
- `nethack-c/upstream/src/trap.c:1506` through `:1511` handles mounted heroes by setting `TT_BEARTRAP`, messaging the steed's foot, and damaging the steed with `thitm(..., dmg, FALSE)`.
- `nethack-c/upstream/src/trap.c:1511` clears the hero trap state when the steed dies.
- `nethack-c/upstream/src/trap.c:1520` applies the unmounted wounded-leg side and duration.
- `nethack-c/upstream/src/trap.c:1524` exercises dexterity after the branch.
- `nethack-c/upstream/src/trap.c:2951` routes ordinary floor-trigger dispatch to `trapeffect_bear_trap()`.

## JS Change

- `js/cmd.js` now has a shared bear-trap result helper used by movement and `#sit`.
- Hidden levitating/flying movement skips the trap effect without revealing the trap; seen in-air movement reports crossing over the trap.
- Seen ordinary movement can escape before damage with the same `rn2(5)` gate used by nearby floor-trap handling.
- Unmounted bear traps now apply the wounded-leg DEX penalty, side, duration, HP damage, trap timeout, and DEX exercise through one shared path.
- Mounted bear traps now set `utrap`/`utraptype`, damage the steed with the `d(2,4)` roll, preserve hero HP and wounded-leg state, and clear the hero trap state if the steed dies.
- Object-list and dismount object-list pending routes now consume `_pending_bear_trap` through the same shared movement result.
- The object-list `--More--` route preserves C timing by deferring HP damage and DEX exercise until the pause is dismissed.

## Tests

- `hero bear trap movement wounds and traps hero`
- `mounted hero bear trap damages steed without hurting hero`
- `mounted hero bear trap killing steed clears trap state`
- `known bear trap can be escaped before damage`
- `flying hero crosses hidden bear trap without triggering`
- `dismount object list consumes pending bear trap`
- `object list bear trap delays damage until more is dismissed`
- `sitting on seen bear trap does not use seen-trap escape roll`

The tests use local trap and steed fixtures with explicit RNG queues. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

The remaining mounted floor-trap cases are `LANDMINE`, `PIT`, `SPIKED_PIT`, and `POLY_TRAP`. `PIT` and `SPIKED_PIT` should be handled together because their C mounted-state and damage shape is shared.
