# 707 - Polearm Skill Range

## C Source

- `nethack-c/upstream/src/apply.c:3371-3385` computes polearm reach with `calc_pole_range()`: minimum squared distance is always 4, maximum is 4 for `P_NONE`/unskilled/basic, 5 for skilled, and 8 for expert or higher.
- `nethack-c/upstream/src/apply.c:3400-3409` makes `could_pole_mon()` use that same min/max window for autohit eligibility.
- `nethack-c/upstream/src/apply.c:3450-3480` makes `use_pole()` reject targets outside that same window with `Too far!` or `Too close!`.
- `nethack-c/upstream/src/apply.c:3373` gets the skill from `uwep_skill_type()`, so lance and Snickersnee use their own weapon skill type rather than the polearms skill row.

## Port Notes

- Added a shared JS polearm reach helper with C's squared-distance windows: 4 at basic or lower, 5 at skilled, and 8 at expert or higher.
- Manual polearm target preview, final polearm validation, empty-quiver polearm fallback, and fireassist's reachable-polearm priority now share the same range helper.
- The helper is item-aware: lances use `P_LANCE`, Snickersnee uses `P_LONG_SWORD`, and ordinary polearms use `P_POLEARMS`.
- Adjacent and self targets remain too close because the minimum distance stays fixed at 4.

## Tests

- `applying skilled polearm hits monster at range five`
- `applying expert polearm hits monster at diagonal range eight`
- `applying basic polearm reports too far at range five`
- `f command skilled quivered ammo with reachable wielded polearm autohits range five`
- `f command basic quivered ammo with polearm range-five target falls through to launcher assist`
- Existing neighboring canaries rerun:
  - `applying wielded polearm hits monster at range two`
  - `f command quivered ammo with reachable wielded polearm uses polearm before launcher assist`

## Remaining Follow-Ups

- Full `find_poleable_mon()` parity still needs prior-`hitmon` remembered target fallback and invisible-marker target selection. Audit 708 covers the first visibility failure split, peaceful confirmation prompt, and impaired tame/peaceful/statue auto-target subset.
- Full `use_pole()` impact parity still needs other artifact-specific behavior and worm cutting. Audit 711 covers engraving wiping; audit 712 covers passive object effects; audit 713 covers Snickersnee distance timing; audit 714 covers `tmiss()` wakeup ordering.
