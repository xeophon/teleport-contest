# Hero Rolling Boulder Boulder Chaining

Date: 2026-06-06

## Scope

Cover the C `launch_obj()` boulder-chaining branch for hero-triggered rolling-boulder traps. When a released hero-triggered boulder reaches another boulder on its path, the original moving boulder now stops on the collision square and the path boulder, including its whole stack, becomes the moving object.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` dispatches hero-triggered rolling-boulder traps through `launch_obj(BOULDER, launch, launch2, style)`, with `LAUNCH_KNOWN` added only for already-known traps.
- `nethack-c/upstream/src/trap.c:3293` through `:3300` splits only the launch-source boulder stack before motion starts.
- `nethack-c/upstream/src/trap.c:3392` through `:3423` advances the path and handles monster/hero collision before rolling path effects.
- `nethack-c/upstream/src/trap.c:3509` through `:3513` applies generic floor effects before boulder chaining.
- `nethack-c/upstream/src/trap.c:3514` through `:3530` handles path boulder chaining: find another boulder, choose the visible crash suffix, extract the path boulder, transfer `otrapped`, place the original moving boulder at the collision square, continue motion with the path boulder, and wake nearby monsters.
- `nethack-c/upstream/src/invent.c:1466` through `:1474` shows `sobj_at()` returning one matching floor object at the coordinate; the path boulder object is not split.
- `nethack-c/upstream/src/trap.c:3533` through `:3543` handles current-square doors and next-square lookahead only after the chaining branch.
- `nethack-c/upstream/src/trap.c:3568` through `:3571` clears `otrapped` and places the surviving moving object at its final square.

## JS Coverage

- `js/cmd.js` now carries the current moving boulder object through the focused hero-triggered rolling-boulder path helper.
- A non-buried, non-transient path boulder at the current square is removed from the floor pile as a whole object/stack and becomes the moving boulder.
- The original moving boulder rests on the collision square, the path boulder receives the moving boulder's `otrapped` marker, and final placement uses the current moving boulder.
- Audible visible crashes use the C-shaped suffixes: `as one boulder sets another in motion` for a continuing path and `as one boulder hits another` for a final/blocked next step. Deaf heroes do not get the crash message.
- The chain branch itself spends no RNG. The iron-bars follow-up still runs after chaining and consumes its bars RNG in the existing path-obstacle model.

## Tests

- `hero rolling boulder sets another boulder stack in motion`
- `hero rolling boulder hits another boulder at final square`
- `hero rolling boulder chain before iron bars reports motion then bars impact`

## Remaining Edges

- Hero-triggered launches still do not share the full monster `launch_obj()` path for monsters, rock-thrower snatching, down gates, land mines, teleport traps, pit/hole/liquid floor effects, launch-drop bones preservation, or true `thitu()` hit/damage routing.
- The generic C `wake_nearto()` side effect is not broadly modeled by the focused command-side helper.
- The command-side helper intentionally filters buried downstream boulders because the C source uses floor-object lookup through `sobj_at()`.
- Shop/timer-specific generic `place_object()` side effects beyond the covered final cleanup remain shared-placement work.
