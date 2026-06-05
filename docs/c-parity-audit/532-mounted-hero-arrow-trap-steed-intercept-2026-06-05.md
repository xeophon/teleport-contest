# Mounted Hero Arrow Trap Steed Intercept

## Scope

Port the C hero arrow-trap path far enough to cover ordinary movement and mounted steed interception. Before this slice, JS only handled arrow traps through the `#sit` dispatcher, so walking onto an arrow trap skipped the C projectile branch entirely. This also left the mounted `u.usteed && !rn2(2)` interception branch missing for arrows.

No replay maps, hidden tests, seeds, player names, or runtime shortcuts are used.

## C Reference

- `nethack-c/upstream/src/trap.c:1018` through `:1025` creates a single trap projectile with `mksobj(ARROW, TRUE, FALSE)`, forces `quan = 1`, clears `opoisoned`, and starts it at the trap square.
- `nethack-c/upstream/src/trap.c:1199` through `:1204` lets known spent arrow traps vanish on `!rn2(15)` before projectile creation.
- `nethack-c/upstream/src/trap.c:1206` through `:1213` marks the trap, prints `An arrow shoots out at you!`, creates the arrow, computes hero-side `dmgval()`, then checks `u.usteed && !rn2(2) && steedintrap(trap, otmp)` before hero `thitu()`.
- `nethack-c/upstream/src/trap.c:1213` through `:1221` uses hero `thitu(8, Maybe_Half_Phys(dam), &otmp, "arrow")`; misses drop the arrow on the hero square and hits consume it.
- `nethack-c/upstream/src/trap.c:3116` through `:3122` resolves mounted arrow traps with `thitm(8, steed, otmp, 0, FALSE)` after syncing the steed to the hero square.
- `nethack-c/upstream/src/trap.c:6721` through `:6770` makes `thitm()` use monster AC plus projectile enchantment for hit chance, drop the projectile on miss, consume it on hit, and apply physical `dmgval()` damage to the monster.

## JS Change

- `js/cmd.js` now has a generated-arrow trap helper that uses the real object factory, then forces C trap-projectile fields including `quan = 1` and `opoisoned = false`.
- Movement over `ARROW_TRAP` now resolves the C arrow-trap branch instead of skipping directly to floor/object messages.
- `#sit` arrow traps now use the same hero arrow-trap result helper as movement.
- Mounted arrow traps now roll the C 1-in-2 steed gate after arrow damage and before hero `thitu()`.
- Steed arrow interception uses `thitm()`-style AC plus arrow enchantment, miss drop, hit consume, and physical damage behavior.
- The existing mounted dart helper now shares steed projectile placement/name helpers with arrows without changing dart poison behavior.

## Tests

- `hero arrow trap miss creates and drops a generated arrow`
- `hero known spent arrow trap can vanish before generating an arrow`
- `mounted hero arrow trap can divert a missed arrow to the steed`
- `mounted hero arrow trap can hit steed without hitting hero`
- `mounted hero arrow trap gate fallthrough still hits hero`

The tests use explicit RNG queues and local trap/pony fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

This slice covers movement and sitting arrow-trap projectile behavior plus mounted arrow interception. Broader `steedintrap()` parity remains open for non-projectile trap types, exact dead-steed dismount messaging, and a shared trap-effect selector that can replace the current path-specific movement/sitting dispatch.
