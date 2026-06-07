# 702 - Fire Command Polearm Fallback

## C Source

- `nethack-c/upstream/src/dothrow.c:467-510` defines `#fire` as "throw from the quiver or use wielded polearm" and starts from `uquiver`.
- `nethack-c/upstream/src/dothrow.c:510-518` applies a wielded polearm with `use_pole(uwep, TRUE)` when the quiver is empty and `autoquiver` is off, before the bullwhip and alternate-polearm branches.
- `nethack-c/upstream/src/apply.c:3279-3330` finds a single poleable monster/statue/invisible square and filters tame or peaceful monsters during ordinary targeting.
- `nethack-c/upstream/src/apply.c:3371-3385` fixes basic polearm reach at squared distance 4.
- `nethack-c/upstream/src/apply.c:3424-3562` implements `use_pole()`: autohit/no-target feedback, range/reach checks, monster attack, statue/boulder thumps, obstacle feedback, and empty-square miss feedback.
- `nethack-c/upstream/src/apply.c:3492-3521` routes a monster at the target square through `thitmonst(mtmp, uwep)`.
- `nethack-c/upstream/src/dothrow.c:2198-2205` increments weapon-hit conduct for `HMON_APPLIED` polearm hits before `hmon()`.
- `nethack-c/upstream/src/uhitm.c:884-895` gives ranged wielded-weapon impact base damage from `rnd(2)`.
- `nethack-c/upstream/src/uhitm.c:1435-1464` adds ordinary strength and increase-damage bonuses for non-propelled attacks.

## Port Notes

- Applied polearm target resolution now checks for a live monster at the selected square before falling through to the existing statue, boulder, obstacle, and empty-square feedback.
- Ordinary applied polearm monster hits use a C-shaped `rnd(20)` hit roll, polearm weapon-skill hit bonus, weapon-hit conduct, wake/anger handling, kill cleanup, and Dexterity exercise. Audit 715 replaces this slice's initial placeholder damage with melee polearm damage dice and long-worm cutting.
- Empty-quiver `f` with `autoquiver` off now applies a wielded polearm before the manual fire-object prompt.
- The `f` polearm fallback autohits a single hostile visible monster exactly two squares away; if no such target is available, it gives the C no-target feedback instead of prompting for ammo.

## Tests

- `applying wielded polearm hits monster at range two`
- `f command empty quiver with wielded polearm autohits before ammo prompt`
- `f command empty quiver with wielded polearm and no target does not prompt for ammo`
- Existing empty-quiver and autoquiver canaries rerun:
  - `f command empty quiver with autoquiver disabled prompts instead of auto-firing`
  - `f command failed autoquiver falls through to fire prompt`
  - `f command autoquiver prefers current launcher ammo over earlier missile`
  - `f command autoquiver prefers missile over alternate launcher ammo`

## Remaining Follow-Ups

- Full applied-polearm `thitmonst()` parity still needs other artifact-specific behavior. Audit 707 covers skill-dependent reach expansion; audit 708 covers confirmation and impaired target selection; audit 710 covers invisible-marker attack checks; audit 711 covers engraving wiping; audit 712 covers passive object effects; audit 713 covers Snickersnee distance timing; audit 714 covers `tmiss()` wakeup ordering; audit 715 covers long-worm cutting and concrete polearm damage dice.
- Audit 704 covers the empty-quiver bullwhip fallback.
- Audit 705 covers the empty-quiver alternate-polearm queued swap/retry branch.
- Audit 703 covers the thrown-and-return weapon shortcut for empty quiver or ammo quiver before the polearm fallback.
- Audit 706 covers fireassist's reachable wielded-polearm priority with quivered/readied ammo, separate from this empty-quiver slice.
