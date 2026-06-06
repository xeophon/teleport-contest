# Rolling Boulder Hero Interruptions

Date: 2026-06-06

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3414` handles `launch_obj()` rolling-boulder contact with the hero. It computes boulder damage, calls `nomul(0)` when `gm.multi` is active, then calls `stop_occupation()` only if `thitu()` reports a hit.
- `nethack-c/upstream/src/mthrowu.c:75` defines `thitu()` hit/miss ordering and messages. Stone missiles against rock-passing forms still return hit after the harmless message.
- `nethack-c/upstream/src/allmain.c:684` defines `stop_occupation()`, clearing the active occupation and calling `nomul(0)`.
- `nethack-c/upstream/src/hack.c:4161` defines `nomul(0)`, including run/travel cancellation and preserving negative immobility through its guard.

## JS Coverage

- `js/allmain.js` now has a shared delayed-occupation clearing helper used by stoning, demonic blackmail, and rolling-boulder hero hits while preserving each caller's prior clearing differences.
- `rollingBoulderHitHeroAt()` now cancels positive repeat/run/travel/search state after the boulder damage roll and before the hit roll, matching the C `dmgval(); nomul(0); thitu()` order.
- Rolling-boulder hits now stop active delayed occupations after the hit messages. Eating uses the resumable interruption path and appends its stop-eating message after the boulder hit message.
- Rolling-boulder misses do not clear active delayed occupations, but still cancel positive repeat/run/travel/search state.
- Rock-passing harmless hits still clear delayed occupations because C `thitu()` returns hit after printing the harmless follow-up.

## Tests

- `rolling boulder miss cancels repeat state but keeps active occupation`
- `rolling boulder hit interrupts eating occupation after hit message`
- `rolling boulder harmless rock-passing hit still clears active occupations`
- Existing hit, miss, and rock-passing rolling-boulder tests continue to pin RNG order and motion continuation.
