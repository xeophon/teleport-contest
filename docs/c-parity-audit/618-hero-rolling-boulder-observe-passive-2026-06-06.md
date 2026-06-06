# Hero Rolling Boulder Observation And Passive Follow-Up

Date: 2026-06-06

## Scope

Cover two `ohitmon()` side effects for hero-triggered rolling boulders:

- visible impact squares observe the moving boulder before the hit roll result is known;
- successful nonlethal monster hits run the hit-only passive-object follow-up before the rolling path continues.

This slice is state-driven and does not use replay maps, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3395` through `:3408` routes hero-triggered rolling boulder trap collisions through `ohitmon(mtmp, singleobj, -1, FALSE)`.
- `nethack-c/upstream/src/mthrowu.c:336` through `:338` sets `vis = cansee(...)` and calls `observe_object(otmp)` before hit/miss RNG.
- `nethack-c/upstream/src/o_init.c:440` through `:449` makes `observe_object()` set `dknown` and mark the object type as encountered when not hallucinating.
- `nethack-c/upstream/src/mthrowu.c:491` through `:497` runs `drop_throw(otmp, 1, bhitpos)` after a non-potion hit, then extracts the object again for rolling-boulder trap motion when the object survives.
- `nethack-c/upstream/src/mthrowu.c:180` through `:190` shows `drop_throw()` ordering: down-gate, floor effects, placement, then `passive_obj()` when `ohit`.
- `nethack-c/upstream/src/uhitm.c:6122` through `:6167` defines hit-only passive-object effects, including acid/fire RNG even when erosion is a no-op for the object.

## JS Coverage

- `heroRollingBoulderHitMonsterAt()` now observes visible rolling-boulder projectiles before the hit roll, setting `dknown` without inventing a boulder discovery entry.
- Hallucinating and blind impacts keep the moving boulder undiscovered, matching `observe_object()` and `cansee()` behavior.
- Successful surviving monster hits now call the existing passive-object helper against the moving boulder at the impact square, then restore its in-motion coordinates.
- Acid passive RNG now happens before later same-square rolling-boulder path effects such as land mines.
- The passive hook does not create a landed boulder copy; the original boulder continues to the rest of the rolling path.

## Tests

- `visible hero rolling boulder monster miss observes distant boulder before hit result`
- `blind hero rolling boulder monster miss does not observe distant boulder`
- `hallucinating hero rolling boulder monster miss does not observe distant boulder`
- `hero rolling boulder hit runs acid passive before same-square land mine`
- `hero rolling boulder miss skips acid passive before same-square land mine`
- `hero rolling boulder acid passive keeps original boulder moving without duplicate`

## Remaining Edges

- Full `drop_throw()` parity remains incomplete for special objects, object-gone stopping, exact floor placement/stacking, shop billing, and broader floor effects at the impact square.
- Full `canspotmon()` parity via telepathy, warning, and monster detection remains separate.
- Shifted-vampire revival is not part of this ordinary rolling-boulder follow-up slice.
- Potion, egg, poison, silver, acid damage, blindness, cream-pie, and special-object lethal attribution remain separate `ohitmon()` slices.
