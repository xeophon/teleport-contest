# 712 - Polearm Passive Object Effects

## C Source

- `nethack-c/upstream/src/apply.c:3492-3521` routes a monster polearm target through `attack_checks()`, records `svc.context.polearm.hitmon`, and calls `thitmonst(mtmp, uwep)`.
- `nethack-c/upstream/src/dothrow.c:2021` classifies `obj == uwep` as `HMON_APPLIED` for applied polearm attacks.
- `nethack-c/upstream/src/dothrow.c:2199-2226` runs `hmon()` on an applied polearm hit, then Dexterity exercise and mulch checks, then `passive_obj(mon, obj, NULL)`.
- `nethack-c/upstream/src/dothrow.c:2227-2228` routes applied polearm misses through `tmiss()` and wakeup without calling `passive_obj()`.
- `nethack-c/upstream/src/uhitm.c:6122` and `nethack-c/upstream/src/uhitm.c:6156-6181` limit `passive_obj()` to successful attack object effects: fire, acid, rust, corrosion, and disenchantment.
- `nethack-c/upstream/include/objects.h:292-341` marks the named polearms, including glaive, halberd, and bec de corbin, as `IRON` weapons.

## Port Notes

- JS applied-polearm monster hits now call `applyDirectMeleePassiveObject()` after hit damage, kill cleanup, wakeup, and Dexterity exercise.
- Applied-polearm misses remain passive-free, matching C's `tmiss()` branch.
- The erosion profile now recognizes the named iron polearms that JS stores in `actualKind`, so generated and wished polearms can rust or corrode even when the display kind is an unidentified polearm appearance.
- This is object-passive parity only; applied polearms still do not run full melee `passive()` counterattack effects on the hero.

## Tests

- `applying polearm hit applies rust monster passive object erosion`
- `applying polearm miss skips rust monster passive object erosion`

## Remaining Follow-Ups

- Full `use_pole()` impact parity still needs other artifact-specific behavior. Audit 713 covers Snickersnee distance timing; audit 714 covers `tmiss()` wakeup ordering; audit 715 covers long-worm cutting and concrete polearm damage dice.
