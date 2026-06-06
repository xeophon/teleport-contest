# Hero Rolling Boulder Drop Throw Impact Square

Date: 2026-06-06

## Scope

Cover the first C `drop_throw(otmp, 1, hitpos)` impact-square pass after a hero-triggered rolling boulder nonlethally hits a monster.

This slice is state-driven and does not use replay maps, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/mthrowu.c:162` through `:190` defines `drop_throw()`: after non-broken objects, `down_gate()`/`ship_object()` runs before `flooreffects()`, and `passive_obj()` is only reached after the object survives and is placed.
- `nethack-c/upstream/src/mthrowu.c:491` through `:497` calls `drop_throw(otmp, 1, gb.bhitpos.x, gb.bhitpos.y)` after a surviving monster hit; rolling boulders with `range == -1` extract the surviving object and keep it moving.
- `nethack-c/upstream/src/trap.c:3408` through `:3427` calls `ohitmon(..., -1, FALSE)` for rolling boulders and then keeps the ordinary rolling path down-gate/floor-effect handling for surviving objects.
- `nethack-c/upstream/src/dokick.c:1651` through `:1681` has `ship_object()` route through `down_gate()`, gives ladders guaranteed drops, gives non-ladders an `rn2(3)` no-drop chance, and lets boulders impact-drop other objects before the caller plugs holes/trap doors.
- `nethack-c/upstream/src/dokick.c:1953` through `:1968` prioritizes down stairs, down ladders, then seen holes/trap doors in `down_gate()`.

## JS Coverage

- `heroRollingBoulderHitMonsterAt()` now routes surviving monster hits through a focused impact helper instead of running passive object effects immediately.
- The helper temporarily evaluates the moving boulder at the hit square, tries down-gate shipping first, then hit-square floor effects, then passive object effects only if the boulder still exists.
- Ladder/stair shipping at the monster square now consumes the boulder before same-square land mines and before acid passive object effects.
- First-attempt no-drop stairs still leave the boulder in motion, so the outer rolling path can make the C second down-gate attempt on the same square.
- Seen-hole/trapdoor impact dropping excludes the transient rolling boulder itself from the impact pile, matching C `ship_object()` inspecting the floor pile before the thrown object is placed.
- Pool/liquid floor effects at the monster square can now consume the boulder before downstream boulder chaining or obstacle handling.

## Tests

- `hero rolling boulder monster hit ships down ladder before passive and land mine`
- `hero rolling boulder monster hit no-drop stairs rolls again in outer path`
- `hero rolling boulder monster hit impact-drops seen hole pile before plugging`
- `hero rolling boulder monster hit fills impact-square pool before downstream boulder`

## Remaining Edges

- Full `drop_throw()` placement, stacking, shop billing, and `place_object()` side effects remain separate from this transient impact ordering slice.
- Special object breakage, eggs, cream pies, venom, and object-gone stopping are still separate `ohitmon()` rows.
- Shifted-vampire revival and special-object lethal attribution remain separate monster-hit slices.
