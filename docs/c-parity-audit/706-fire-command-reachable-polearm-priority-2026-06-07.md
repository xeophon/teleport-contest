# 706 - Fire Command Reachable Polearm Priority

## C Source

- `nethack-c/upstream/src/dothrow.c:557-562` checks `uquiver && is_ammo(uquiver) && iflags.fireassist && !skip_fireassist`, then immediately returns `use_pole(uwep, TRUE)` when the primary weapon is a polearm and `could_pole_mon()` succeeds.
- `nethack-c/upstream/include/obj.h:238-248` makes `is_ammo()` narrower than missiles: launcher ammo such as arrows, bolts, stones, and gems qualify; darts, shuriken, daggers, and boomerangs do not.
- `nethack-c/upstream/src/apply.c:3371-3409` implements `could_pole_mon()`: it requires a wielded polearm and a unique reachable polearm target, with remembered-target fallback when available.
- `nethack-c/upstream/src/apply.c:3424-3562` implements `use_pole(uwep, TRUE)`: autohit skips the position prompt, validates reach, attacks the selected target, and consumes time for the ordinary monster attack.

## Port Notes

- `beginHeroFireProjectile()` now checks for the fireassist polearm-priority branch before launcher selection.
- The guard uses `heroThrowAmmoSkill(projectile)` as the JS `is_ammo()` proxy, so missiles such as darts stay on the ordinary fire path.
- A reachable primary-wielded polearm now bypasses launcher matching, direction prompt, and projectile consumption for quivered ammo.
- Autoquiver and manual fire selection still print the `You ready:` message first; after the more prompt, the stored polearm target is attacked instead of entering fire direction handling.
- If no polearm autohit target is available, launcher assist remains the next branch.

## Tests

- `f command quivered ammo with reachable wielded polearm uses polearm before launcher assist`
- `f command autoquivered ammo with reachable wielded polearm readies then uses polearm`
- `f command nofireassist quivered ammo with reachable wielded polearm keeps firing ammo`
- `f command quivered missile with reachable wielded polearm does not use ammo priority`
- `f command quivered ammo with wielded polearm but no target still uses launcher assist`
- Existing neighboring canaries rerun:
  - `f command empty quiver with wielded polearm autohits before ammo prompt`
  - `f command empty quiver swaps alternate polearm and retries before ammo prompt`
  - `f command autoquiver prefers current launcher ammo over earlier missile`

## Remaining Follow-Ups

- Full `could_pole_mon()`/`use_pole()` parity remains broader than the current ordinary visible hostile monster autohit subset: remembered targets, invisible/statue glyphs, peaceful/tame confirmation, impaired targeting, and exact messaging still need separate audits. Audit 707 covers skill-dependent reach expansion; audit 712 covers passive object effects; audit 713 covers Snickersnee distance timing.
- The JS fireassist launcher/swap paths still mutate state inline instead of using C's queued `doswapweapon`/`dowield`/retry command lifecycle.
