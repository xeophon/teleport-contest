# Direct Throw Launcher Multishot Monster Hit

## C Source

- `nethack-c/upstream/src/dothrow.c:350-375` routes ordinary `t` through `throw_obj(obj, shotlimit)` after item selection.
- `nethack-c/upstream/src/dothrow.c:161-168` enables multishot for ammo stacks only when the ammo matches the wielded launcher.
- `nethack-c/upstream/src/dothrow.c:240-247` emits the single pre-volley message, such as `You shoot 2 arrows.`
- `nethack-c/upstream/src/dothrow.c:250-270` then loops over the volley, splitting one object where needed and calling `throwit()` for each projectile.

## JS Gap

The JS `f` path now resolves fired monster-impact volleys one projectile at a time, but direct `t` still created one `thrownObject` with `quan: 1` before impact. A stack of arrows thrown while wielding a matching bow only resolved one hit.

## Change

- Added a direct matching-launcher ammo multishot branch in `throwDirection`.
- The branch keeps the existing simplified two-shot cap, then resolves each shot as an independent `quan: 1` projectile.
- Split shots use fresh object ids and clear stale shop identity fields; the final original unit keeps the source id.
- Each projectile gets its own flight scan, monster impact, mulch/passive handling, and landing.

## Coverage

- `hero-thrown stacked arrows with matching bow hit monster as separate shots`

## Remaining

- Prompt-selected count-one stack splitting is covered by audit 737, and top-level throw shot limits are covered by audit 694.
- The direct branch is scoped to matching launcher ammo; non-ammo stackable weapon multishot still needs a separate slice.
- Shop-specific direct multishot billing coverage remains to be added.
