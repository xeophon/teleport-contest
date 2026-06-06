# Hero-Triggered Rolling Boulder No-Release

Date: 2026-06-06

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` captures the rolling-boulder trap's prior `tseen` state in `style` before `feeltrap()` marks the trap known.
- `nethack-c/upstream/src/trap.c:2669` calls `launch_obj(BOULDER, launch, launch2, style)` for hero-triggered rolling-boulder traps.
- `nethack-c/upstream/src/trap.c:2672` prints `No boulder was released.` only when the trap was already known before the trigger; otherwise it prints `Fortunately for you, no boulder was released.`
- `nethack-c/upstream/src/trap.c:3274` lets `launch_obj()` find a boulder at either launch endpoint, swapping the start/end coordinates when the boulder is on `launch2`.
- `nethack-c/upstream/src/trap.c:3288` returns `0` immediately when no launch object exists, so hero-hit damage and hit RNG are not consumed for no-release traps.

## JS Coverage

- `js/cmd.js` now shares hero-triggered rolling-boulder result construction between movement and `#sit`.
- Hero-triggered no-boulder cases now preserve the C prior-known wording split while still marking the trap seen after triggering.
- Deaf heroes no longer receive the `Click!` prefix for hero-triggered rolling-boulder traps.
- No-release hero-triggered rolling-boulder traps no longer consume the simplified hero-collision `rnd(20)` rolls.
- Hero-triggered launches now accept a boulder on the opposite endpoint and move it back toward the original `launch` square, matching `launch_obj()`'s `otherside` lookup.

## Tests

- `hero rolling boulder trap with no boulder reports no release`
- `known hero rolling boulder trap with no boulder uses known wording`
- `deaf hero rolling boulder trap omits click prefix`
- `hero rolling boulder trap can launch boulder from opposite side`
- `sitting rolling boulder trap with no boulder reports no release`

## Remaining Edges

- The hero-triggered branch still uses the existing simplified launch hit/miss handling once a boulder is released. Full reuse of the richer `launch_obj()` port remains open, including mounted-steed diversion, launch-drop preservation, and final placement side effects.
