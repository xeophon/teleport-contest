# Hero Multishot Iron Bars Flight

## C Source

- `nethack-c/upstream/src/dothrow.c:252-270` chooses the volley count, then loops over each shot, splitting one object and calling `throwit()` for that single projectile.
- `nethack-c/upstream/src/dothrow.c:582` routes the `f` command through the same `throw_obj()` multishot path.
- `nethack-c/upstream/src/dothrow.c:1674-1678` sends each horizontal projectile through `bhit(... THROWN_WEAPON ...)`.
- `nethack-c/upstream/src/zap.c:3900-3912` checks iron bars for each projectile and consumes the non-pointblank `rn2(5)` force-hit roll before monster contact.
- `nethack-c/upstream/src/mthrowu.c:1497-1558` lets arrows, bolts, darts, shuriken, spears, and knives pass through bars unless the force-hit roll succeeds.

## JS Gap

Singleton hero throws used the C-shaped iron-bars scan, but the shared fired/direct multishot helper still treated `IRONBARS` as an ordinary obstruction. Direct `t` also scanned once before calculating the multishot count, so an iron-bars roll could happen before the C volley-count RNG.

## Change

- Made `heroFireProjectileFlightResult()` support an opt-in C-shaped iron-bars mode.
- Routed `f` command singleton and multishot projectiles through the bars-aware flight path.
- Moved direct `t` volley detection before the preflight scan so multishot count RNG happens before any per-projectile bars roll.
- Resolved direct multishot flight per projectile, including per-shot bars pass/stop behavior and nonbreaking impact messages.

## Coverage

- `top-level throw count dart can pass through iron bars to hit a monster`
- `hero-thrown stacked darts each pass through iron bars to hit a monster`
- `f command arrow with matching bow can pass through iron bars to hit a monster`
- `f command stacked arrows with matching bow each pass through iron bars`

## Remaining

- Forced bars-hit multishot cases where one projectile stops and later projectiles continue.
- Fired/direct fragile multishot objects breaking on bars.
- Wider class matrix coverage for non-weapon multishot-adjacent projectiles.
