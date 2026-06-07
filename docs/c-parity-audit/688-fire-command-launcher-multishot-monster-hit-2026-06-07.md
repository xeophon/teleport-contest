# Fire Command Launcher Multishot Monster Hit

## C Source

- `nethack-c/upstream/src/dothrow.c:151-235` computes launcher/ammo multishot only when the ammo stack has quantity greater than one and matches the wielded launcher.
- `nethack-c/upstream/src/dothrow.c:240-247` prints `You shoot N arrows.` for multishot volleys.
- `nethack-c/upstream/src/dothrow.c:254-268` resolves each projectile separately: split one object with `splitobj(obj, 1L)` while the stack has more than one object, remove that projectile from inventory with `freeinv()`, then call `throwit()` for that single projectile.

## JS Gap

Before this slice, the `f` command selected a multishot count but built one `projectileObject` with `quan: shotCount` for monster impacts. That collapsed hit rolls, damage rolls, poison, mulch, passive handling, and landing into a single event.

## Change

- Added a shared `heroFireProjectileFlightResult()` helper for the fire-direction scan.
- Added `heroFireProjectileMonsterImpact()` so fired and by-hand target impacts use the same dispatch in both single-shot and multishot paths.
- Routed fired monster-impact volleys with `shotCount > 1` through separate `quan: 1` projectile objects. Each shot now:
  - recomputes the line of fire against the current monster list,
  - uses a C-like split object id while the source stack still has more than one item,
  - clears stale split identity fields for fresh split objects,
  - applies hit/damage/poison/mulch independently,
  - lands surviving projectiles independently so compatible floor stacks can merge afterward.

## Coverage

- `f command stacked arrows with matching bow hit monster as separate shots`

## Remaining

- The multishot count calculation is still narrower than C: this slice preserves the existing two-shot cap rather than implementing role/race/skill multishot bonuses.
- Direct `t` matching-launcher multishot is covered by audit 689.
- No dedicated unpaid fired-multishot-into-monster regression yet; the split path now clears stale bill identity fields, but shop-specific coverage should be added when the broader billing slice is tackled.
