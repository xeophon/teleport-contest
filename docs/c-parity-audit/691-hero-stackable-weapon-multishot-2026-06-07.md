# Hero Stackable Weapon Multishot

## C Source

- `nethack-c/upstream/src/dothrow.c:158-168` enables multishot for stacks whose object class is `WEAPON_CLASS`, even when they are not launcher ammo.
- `nethack-c/upstream/src/dothrow.c:169-182` applies the weak-multishot gates, skill bonuses, and role bonuses before rolling `rnd(multishot)`.
- `nethack-c/upstream/src/dothrow.c:233-270` clamps the count and then splits and throws one object per loop iteration.
- `nethack-c/upstream/src/dothrow.c:39-45` gives relevant role bonuses: Cave dweller for spear skill, Rogue for dagger skill, Ranger for non-dagger skills, plus dart/shuriken-specific roles handled by the prior slice.

## JS Gap

The JS non-launcher multishot helper only recognized darts and shuriken. Direct `t` and `f` therefore still collapsed stackable dagger, knife, spear, and javelin families to a singleton throw even though their monster-impact code already existed.

## Change

- Replaced the dart/shuriken-only multishot helper with a stackable thrown-weapon helper.
- The supported set now covers the thrown-weapon data already implemented for monster impacts: dagger, knife, dart, shuriken, spear variants, and javelin.
- Added the C role bonuses that apply to this supported set: Cave dweller spear, Rogue dagger, Ranger non-dagger, plus the prior Monk/Ninja dart/shuriken handling.
- Kept both direct `t` and `f` on the same per-shot branch, so selected non-ammo weapon stacks resolve with one hit, damage, mulch, passive, and landing pass per projectile.

## Coverage

- `hero-thrown stacked daggers hit monster as separate throws`
- `f command no-launcher stacked spears hit monster as separate throws`

## Remaining

- C technically gates on any stackable `WEAPON_CLASS`; JS remains limited to weapon families whose thrown monster impact is already modeled.
- Audit 692 adds dagger and knife variant metadata; additional dedicated regressions for the less common variants remain useful.
- Explicit non-gold throw counts and early-stop wording remain separate from automatic multishot.
