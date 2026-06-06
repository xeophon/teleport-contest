# Hero Rolling Boulder Mimic Reveal

Date: 2026-06-06

## Scope

Cover the object/furniture mimic branch of `ohitmon()` for hero-triggered rolling-boulder paths after rock-thrower snatch handling.

This slice is state-driven and does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:2666` dispatches hero-triggered rolling-boulder traps through `launch_obj(BOULDER, launch, launch2, ROLL)`.
- `nethack-c/upstream/src/trap.c:3395` through `:3408` handles monster collisions, tries rock-thrower snatching first, then calls `ohitmon(mtmp, singleobj, -1, FALSE)` for rolling boulders.
- `nethack-c/upstream/src/mthrowu.c:335` defines the relevant disguised-mimic branch as `M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) != M_AP_MONSTER`.
- `nethack-c/upstream/src/mthrowu.c:340` through `:350` performs the hit roll before any reveal.
- `nethack-c/upstream/src/mthrowu.c:350` through `:356` suppresses miss text for object/furniture mimics and does not reveal them on a miss.
- `nethack-c/upstream/src/mthrowu.c:373` through `:382` rolls non-potion damage first, then calls `seemimic()`, then clears `msleeping`.
- `nethack-c/upstream/src/mon.c:4409` through `:4426` clears mimic appearance state and redraws the square in `seemimic()`.
- `nethack-c/upstream/src/mthrowu.c:494` through `:497` keeps a non-consumed rolling boulder moving when `range == -1`.

## JS Coverage

- `js/cmd.js` now imports `M_AP_MONSTER` so the command-side rolling-boulder path can match C's `M_AP_TYPE != M_AP_MONSTER` distinction.
- `heroRollingBoulderHitMonsterAt()` captures disguised mimic state before the hit roll.
- Visible misses against object/furniture mimics now consume only the hit-roll RNG, suppress `The boulder misses ...`, leave sleep and appearance state unchanged, and keep the boulder rolling.
- Successful hits roll boulder damage first, clear `m_ap_type`, `appearObj`, `appearGlyph`, and `appearColor`, redraw the square, then clear sleep and emit the ordinary hit message with the real monster name.
- Rolling continuation remains unchanged: ordinary object/furniture mimic hit/miss returns `consumed: false`.

## Tests

- `hero rolling boulder reveals object mimic on hit`
- `hero rolling boulder reveals furniture mimic on hit`
- `hero rolling boulder suppresses visible miss against object mimic`

## Remaining Edges

- `seemimic()` light-unblocking, `mappearance`, and corpse-appearance cleanup are represented only by current JS appearance fields.
- `observe_object()` side effects for visible boulder hits remain separate.
- Full `drop_throw()` fallout remains incomplete for shop billing, floor effects, passive-object erosion, and object-gone stopping.
- Full lethal attribution for mimic hits remains broader than the local cleanup: `xkilled()` vs `mondied()`, lifesaving, corpse/statue creation, and special death callbacks need separate canaries.
- Potion, egg, poison, silver, acid, blindness, cream-pie, and passive combat effects remain separate `ohitmon()` slices.
- `M_AP_MONSTER` apparent-monster disguises are explicitly not this C branch.
