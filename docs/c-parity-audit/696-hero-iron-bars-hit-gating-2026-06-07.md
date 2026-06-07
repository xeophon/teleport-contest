# Hero Iron Bars Hit Gating

## C Source

- `nethack-c/upstream/src/dothrow.c:1674-1678` sends horizontal hero throws through `bhit(... THROWN_WEAPON ...)`.
- `nethack-c/upstream/src/zap.c:3900-3912` calls `hits_bars(..., point_blank ? 0 : !rn2(5), 1)` for thrown and kicked weapons that encounter iron bars.
- `nethack-c/upstream/src/mthrowu.c:1417-1495` handles object impact, breakage, and the `Whang` / `Whap` / `Flapp` / `Clink` / `Clonk` sound selection.
- `nethack-c/upstream/src/mthrowu.c:1497-1558` gates automatic iron-bars hits by object class: bows, crossbows, darts, shuriken, spears, and knives can pass unless the `rn2(5)` force-hit roll succeeds, while dagger-class objects hit.
- `nethack-c/upstream/src/dothrow.c:1780-1793` performs the later landing break test after a nonbreaking bars impact.

## JS Gap

The horizontal hero throw scan stopped every projectile at iron bars before applying the C `hits_bars()` class rules. That made pass-through projectiles land on the thrower side of the bars and skipped the nonbreaking impact message and bars/landing RNG ordering for class-stopped objects.

## Change

- Added a C-shaped hero-thrown iron-bars hit predicate for the supported weapon, armor, tool, wand, spellbook, ball, chain, boulder, and simple food cases.
- Moved the non-pointblank `rn2(5)` force-hit roll into the flight scan so pass-through objects consume the same roll before continuing through bars.
- Let darts and similar excluded classes continue through bars when the force-hit roll fails.
- Stopped dagger-class objects at bars, emitted the nonbreaking impact sound, and preserved the later landing break test.

## Coverage

- `hero-thrown dagger clonks iron bars before landing`
- `hero-thrown dart can pass through iron bars to hit a monster`

## Remaining

- Broader impact sound coverage for `Whang`, `Whap`, `Flapp`, and silver/gold `Clink`.
- Pointblank bars impacts.
- Heavy projectile damage to bars and iron-bars dissolution cases.
- Full armor, tool, rock/statue, corpse, and food class matrices.
- Multishot fired/thrown projectile bars pass-through beyond the singleton throw path.
