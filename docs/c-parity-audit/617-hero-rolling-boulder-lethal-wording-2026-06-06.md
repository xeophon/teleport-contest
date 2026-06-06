# Hero Rolling Boulder Lethal Wording

Date: 2026-06-06

## Scope

Cover the ordinary lethal monster branch of `ohitmon()` for hero-triggered rolling boulders: the death-line subject, `killed` versus `destroyed`, nonverbose visible deaths, and known versus unknown rolling-boulder trap attribution.

This slice is state-driven and does not use replay maps, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3395` through `:3408` handles rolling-boulder collisions and calls `ohitmon(mtmp, singleobj, -1, FALSE)`.
- `nethack-c/upstream/src/mthrowu.c:336` through `:338` sets `vis` from `cansee()` and observes the object when visible.
- `nethack-c/upstream/src/mthrowu.c:451` through `:458` subtracts damage, then prints `Monnam(mtmp) is killed/destroyed!` when the monster dies and the square is visible, or when verbose out-of-sight unaimed feedback applies.
- `nethack-c/upstream/src/mthrowu.c:456` through `:458` uses `destroyed` for `nonliving(mtmp->data)`, `is_vampshifter(mtmp)`, or `!canspotmon(mtmp)`; otherwise it uses `killed`.
- `nethack-c/upstream/src/mthrowu.c:459` through `:464` gives hero credit with `xkilled(..., XKILL_NOMSG)` only when the hero caused the throw and the object is not an unknown rolling boulder trap projectile. Unknown trap boulders fall through to `mondied()`.
- `nethack-c/upstream/src/do_name.c:840` through `:912` makes `M_AP_MONSTER` use the apparent monster for `Monnam()` when the monster can be spotted.
- `nethack-c/upstream/src/do_name.c:861` through `:884` makes unspotted monsters print as `it`; `Monnam()` capitalizes that to `It`.

## JS Coverage

- `heroRollingBoulderMonsterTargetName()` remains verbose-sensitive for hit/miss text.
- New Monnam-like rolling-boulder helpers use visible/spottable target names for death lines, so visible nonverbose kills still name the monster.
- Hidden or otherwise unspotted lethal targets now use `It is destroyed!` instead of leaking the real monster name.
- Visible nonliving and vampshifter-style targets now use `destroyed` instead of `killed`.
- Existing `recordVanquished(mon, !!movingBoulder?.otrapped)` behavior preserves the C distinction between known and unknown hero-triggered rolling-boulder traps for experience credit in this JS model.

## Tests

- `hero rolling boulder lethal hidden target says it is destroyed`
- `hero rolling boulder destroys visible nonliving target on lethal hit`
- `hero rolling boulder nonverbose lethal visible target still names death`

## Remaining Edges

- Full `canspotmon()` parity via telepathy, warning, and monster detection remains separate.
- Shifted-vampire revival is not part of this ordinary rolling-boulder death wording slice.
- `observe_object()` discovery side effects for visible boulder hits remain separate.
- Full `drop_throw()` fallout remains incomplete for shop billing, floor effects, passive-object erosion, and object-gone stopping.
- Potion, egg, poison, silver, acid, blindness, cream-pie, and passive combat effects remain separate `ohitmon()` slices.
