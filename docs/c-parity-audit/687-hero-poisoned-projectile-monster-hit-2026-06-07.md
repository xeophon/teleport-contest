# 687 - Hero Poisoned Projectile Monster Hit

## C Source

- `nethack-c/upstream/src/dothrow.c:2011-2205` sends hero-thrown/fired projectile monster hits through `thitmonst()` and then `hmon()` only after the hit roll succeeds.
- `nethack-c/upstream/src/uhitm.c:1048-1062` marks thrown ammo/missiles as poisoned hits when the object is poisoned and `is_poisonable()`.
- `nethack-c/upstream/include/obj.h:262-267` limits ordinary poisonable weapons to arrows, bolts, darts, shuriken/throwing stars, and permanent poison artifacts.
- `nethack-c/upstream/src/uhitm.c:1509-1537` applies poisoned weapon alignment messages, poison wear-off, resistance messaging, nonfatal `rnd(6)` damage, or deadly poison.
- `nethack-c/upstream/src/uhitm.c:1809-1810` runs poison after physical damage has been recalculated but before the hit message and HP subtraction.
- `nethack-c/upstream/src/uhitm.c:1894-1925` reports poison resistance, suppresses the ordinary kill message for deadly poison via `XKILL_NOMSG`, and defers the no-longer-poisoned message until after the hit message.

## Port Notes

- `heroFiredLauncherAmmoImpact()` now adds the hero poison branch for matching launcher ammo only, covering fired/thrown arrows, ya, and crossbow bolts that use their launcher.
- `heroThrownByHandAmmoImpact()` keeps the weak C ranged damage for unmatched bow/crossbow ammo but still applies poisoned-hit side effects, matching the C ordering where `ispoisoned` is set before the weak ranged branch.
- `heroThrownWeaponImpact()` now enables poison for thrown darts and shuriken while keeping generic kicked weapon impacts on the non-poisoned path.
- The poison helper preserves C ordering: alignment message first, `rn2(nopoison)` wear-off, resistance check without the deadly roll, then either `rn2(10)`/`rnd(6)` nonfatal damage or deadly poison cleanup without the ordinary `You kill ...!` message.

## Tests

- `hero-thrown poisoned dart applies C poison after weapon damage`
- `f command no-launcher poisoned dart respects monster poison resistance`
- `f command poisoned arrow with matching bow respects monster poison resistance`
- `hero-thrown poisoned unmatched crossbow bolt by hand respects monster poison resistance`

## Remaining Follow-Ups

- Samurai/lawful alignment penalties are implemented in the helper but still need dedicated role/alignment tests.
- Permanent poison artifact handling, if added to thrown artifact support later, still needs the C `dieroll <= 5` gate.
- Broader poison/death interactions with shapeshifters, lifesaving-style cleanup, passives, and multishot stacks remain separate slices.
