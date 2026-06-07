# Throw Prompt Count Selected Stack

## C Source

- `nethack-c/upstream/src/dothrow.c:368-375` passes only the top-level command count as `shotlimit` into `throw_obj()`.
- `nethack-c/upstream/src/invent.c:2028-2045` rejects non-gold `getobj("throw", ...)` counts above one, but permits count one.
- `nethack-c/upstream/src/invent.c:2075-2084` splits a counted selection before returning it to `throw_obj()`.
- `nethack-c/upstream/src/dothrow.c:161-238` runs launcher-ammo multishot only when the selected object quantity is greater than one, then separately applies the top-level `shotlimit`.

## JS Gap

JS accepted `t1b` for non-gold stacks, but only retained prompt/menu counts for gold. A matching launcher ammo stack selected with prompt count one still reached `throwDirection` at full stack quantity, so it could roll and fire a multishot volley. C sees a one-object split from `getobj()`, so no launcher multishot roll occurs.

## Change

- Stored prompt/menu-selected throw counts for all valid selections, not just gold.
- Split non-gold counted selections after direction and early throw refusal checks, but before range, multishot, and impact handling.
- Kept top-level `1t`/`2t` behavior as a separate shot limit via `_throw_shot_limit`.
- Preserved existing rejection of non-gold prompt/menu counts above one before direction selection.

## Coverage

- `hero-thrown prompt count one matching launcher ammo suppresses multishot`
- Existing throw prompt-count and top-level throw-count tests remain part of the focused verification set.

## Remaining

- Broader direct projectile gaps such as poisoned ammo side effects and some special cleanup remain separate slices. Hero projectile mimic reveal is covered by audit 738.
