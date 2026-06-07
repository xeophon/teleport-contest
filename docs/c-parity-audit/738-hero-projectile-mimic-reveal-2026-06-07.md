# Hero Projectile Mimic Reveal

## C Source

- `nethack-c/upstream/src/dothrow.c:1477-1492` routes hero projectile contact through `throwit_mon_hit()` and `thitmonst()`.
- `nethack-c/upstream/src/dothrow.c:2011-2021` classifies ordinary thrown objects as `HMON_THROWN`.
- `nethack-c/upstream/src/dothrow.c:2193-2205` calls `hmon()` for successful weapon/ammo/gem projectile hits.
- `nethack-c/upstream/src/uhitm.c:1923-1926` calls `wakeup(mon, TRUE)` only for surviving, on-map hit targets.
- `nethack-c/upstream/src/dothrow.c:1951-1964` lets `tmiss()` wake a missed target on the `!rn2(3)` branch.
- `nethack-c/upstream/src/mon.c:4333-4343` reveals only object/furniture appearances during `wakeup()`; `M_AP_MONSTER` stays disguised.
- `nethack-c/upstream/src/mon.c:4409-4426` clears mimic appearance state and redraws the square in `seemimic()`.

## JS Gap

The direct hero projectile hit helpers woke and angered surviving targets, but did not clear object/furniture mimic appearance state. Monster-thrown and rolling-boulder projectile paths already had this C-shaped reveal coverage.

## Change

- Added a local direct-hero projectile reveal helper in `cmd.js`, mirroring the existing monster projectile helper without introducing an `allmain.js` import cycle.
- `wakeMonsterFromHeroThrownHit()` now clears `m_ap_type`, `appearObj`, `appearGlyph`, and `appearColor` for object/furniture appearances before angering the target.
- `wakeMonsterFromHeroThrownMiss()` uses the same reveal helper on its existing wakeup roll branch.
- Direct hero projectile miss messages now use C's generic `The <missile> misses.` wording for object/furniture appearances.
- `M_AP_MONSTER` appearances remain disguised, matching C `wakeup()`.

## Coverage

- `hero-thrown matching bow arrow reveals object mimic on hit`
- `hero-thrown matching bow arrow preserves apparent-monster mimic on hit`
- `hero-thrown matching bow arrow miss wake roll reveals object mimic`

## Remaining

- Lethal direct projectile hit cleanup and broader special projectile cleanup remain separate slices. Poisoned ammo side effects are covered by audits 687 and 739.
