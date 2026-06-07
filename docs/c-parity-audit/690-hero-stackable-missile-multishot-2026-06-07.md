# Hero Stackable Missile Multishot

## C Source

- `nethack-c/upstream/src/dothrow.c:151-168` enables hero multishot for either matching launcher ammo or any stackable object whose class is `WEAPON_CLASS`.
- `nethack-c/upstream/src/dothrow.c:169-182` builds the non-ammo multishot cap from skill, weak-multishot gates, and role bonuses, then chooses `rnd(multishot)`.
- `nethack-c/upstream/src/dothrow.c:240-270` prints one volley message, then splits and throws one object at a time through `throwit()`.
- `nethack-c/upstream/include/obj.h:238-244` classifies darts and shuriken as missiles, not launcher ammo.

## JS Gap

Launcher ammo multishot was split into per-projectile impacts for both `f` and direct `t`, but non-launcher stackable missiles still fell back to the singleton direct throw path. A stack of darts only resolved one monster hit.

## Change

- Added a narrow non-launcher missile multishot count helper for dart and shuriken objects.
- The helper follows the C gates for confusion, stun, weak multishot roles, fumbling, dexterity, skilled/expert bonuses, and the Monk/Ranger bonuses that apply to this supported set.
- Routed both `f` with no launcher and direct `t` through the same count helper.
- Reused the existing per-shot branch so each selected dart or shuriken resolves as its own `quan: 1` projectile with independent hit, damage, mulch, passive, and landing handling.
- Non-launcher volleys now use the C-shaped `You throw N darts.` message rather than `shoot`.

## Coverage

- `hero-thrown stacked darts hit monster as separate throws`
- `f command no-launcher stacked darts hit monster as separate throws`

## Remaining

- This slice intentionally covered only darts and shuriken; audit 691 expands the same split path to the currently supported dagger, knife, spear, and javelin thrown-weapon families.
- Launcher-ammo-specific multishot bonuses such as Samurai ya/yumi, racial bow/crossbow bonuses, quest artifact launcher bonuses, crossbow strength limits, and explicit throw counts still need source-backed slices.
- Shop-specific unpaid non-launcher multishot billing coverage remains to be added.
