# 704 - Fire Command Bullwhip Fallback

## C Source

- `nethack-c/upstream/src/dothrow.c:510-517` applies a primary-wielded bullwhip with `use_whip(uwep)` when the quiver is empty and `autoquiver` is off, after the polearm fallback.
- `nethack-c/upstream/src/apply.c:2964-2973` makes applying a non-wielded bullwhip first wield it and queue a repeat apply, while an already-wielded bullwhip prompts for direction.
- `nethack-c/upstream/src/apply.c:2980-2987` maps the selected direction, returns `You miss.` without time for off-map targets, and otherwise resolves the adjacent square.
- `nethack-c/upstream/src/apply.c:3245-3261` prints the ordinary no-weapon monster flick/snap feedback and wakes the target.
- `nethack-c/upstream/src/apply.c:3263-3270` snaps through thin air on air or water levels, otherwise prints `Snap!`, and consumes time.

## Port Notes

- Applying a wielded bullwhip now enters a shared direction prompt instead of falling through to the unknown-apply message.
- Applying a carried but non-wielded bullwhip now wields it first, matching the first `use_whip()` branch.
- Empty-quiver `f` with `autoquiver` off now applies a primary-wielded bullwhip before the manual fire-object prompt.
- Ordinary horizontal bullwhip use now covers the adjacent no-target snap, off-map miss without time, and visible adjacent no-weapon monster flick/snap wakeup path.
- Quivered ammo and successful autoquiver keep priority over the bullwhip fallback, matching the `dofire()` branch order.

## Tests

- `applying wielded bullwhip uses direction prompt and snaps with no target`
- `applying wielded bullwhip off map misses without time`
- `f command empty quiver with wielded bullwhip applies it before ammo prompt`
- `f command wielded bullwhip flicks adjacent visible monster before ammo prompt`
- `f command autoquiver still beats wielded bullwhip fallback`
- `f command quivered ammo with wielded bullwhip fires ammo instead of whip`
- Existing fire fallback canaries rerun:
  - `f command empty quiver with wielded polearm and no target does not prompt for ammo`
  - `f command empty quiver with autoquiver disabled prompts instead of auto-firing`
  - `f command failed autoquiver falls through to fire prompt`

## Remaining Follow-Ups

- Full `use_whip()` parity still needs welded-weapon disarm feedback, proficient `force_attack()`, mimic reveal, pit escape, exact self/down behavior, steed mistakes, full underwater/swallowed handling, fumbling/glib drops, floor snaring, dead-horse feedback, exact wakeup visibility, and shop/timer side effects.
- Audit 716 covers the horizontal water/lava wall splash branch.
- Audit 717 covers the visible armed-monster unproficient slip and proficiency-1 default disarm branch.
- Audit 718 covers the higher-proficiency visible armed-monster hero-square and inventory-snatch disarm destinations.
- Audit 705 covers the empty-quiver alternate-polearm queued swap/retry branch.
- Audit 706 covers the reachable wielded-polearm priority with quivered/readied ammo.
- Fireassist launcher swaps still mutate state inline instead of queuing C's `doswapweapon`/`dowield`/retry sequence.
