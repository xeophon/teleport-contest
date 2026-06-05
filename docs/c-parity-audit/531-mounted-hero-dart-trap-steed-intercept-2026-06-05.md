# Mounted Hero Dart Trap Steed Intercept

## Scope

Port the mounted hero dart-trap interception branch. Prior dart-trap slices aligned generated dart objects, hero damage, poison ordering, death/life-saving routing, and `thitu()` feedback, but mounted heroes still always resolved the dart against the hero. C gives the steed a 1-in-2 chance to intercept before hero `thitu()`.

No replay maps, hidden tests, seeds, player names, or runtime shortcuts are used.

## C Reference

- `nethack-c/upstream/src/trap.c:1271` prints `A little dart shoots out at you!`.
- `nethack-c/upstream/src/trap.c:1272` through `:1275` creates the generated dart, rolls trap poison, and computes hero-side `dmgval()` before the mounted branch.
- `nethack-c/upstream/src/trap.c:1276` checks `u.usteed && !rn2(2) && steedintrap(trap, otmp)` before hero `thitu()`.
- `nethack-c/upstream/src/trap.c:3124` through `:3130` resolves mounted dart traps with `thitm(7, steed, otmp, 0, FALSE)`.
- `nethack-c/upstream/src/trap.c:6721` through `:6770` makes `thitm()` use monster AC plus dart enchantment for hit chance, drop the dart on miss, consume it on hit, and apply physical dart damage only. Trap-dart poison has no monster poison effect there.
- `nethack-c/upstream/src/trap.c:3163` through `:3165` dismounts if the trap killed the steed.

## JS Change

- `js/cmd.js` now rolls the C mounted interception gate after generated dart damage and before hero `thitu()`.
- When the steed intercepts, the dart uses monster `thitm()`-style hit chance and generated-dart damage against the steed.
- Steed hit/miss messages name the generated dart object, including trap poison state.
- Missed steed-intercept darts are placed on the steed/hero square and preserve generated dart state as fetchable floor darts.
- Hit steed-intercept darts are consumed and do not run the hero poisoned-dart branch, matching C `thitm()`.
- Steed death cleanup dismounts the hero and removes the steed through the existing monster inventory/corpse/vanquish helpers.

## Tests

- `mounted hero poisoned dart trap can divert a missed dart to the steed`
- `mounted hero poisoned dart trap can hit steed without poisoning hero`
- `mounted hero dart trap gate fallthrough still hits hero`
- `mounted hero dart trap killing steed dismounts without hero death mode`

The tests use explicit RNG queues and local mounted pony fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

This slice covers the dart-trap steed-intercept path and the mounted fall-through gate. Broader mounted trap parity remains open for steed death message polish and other trap types that call `steedintrap()`.
