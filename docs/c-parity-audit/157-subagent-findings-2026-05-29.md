# Subagent Findings 2026-05-29

Fresh read-only agents audited five separate C parity areas. No private-suite details were used.

## Implemented Slice: Gray Stone `#apply`

- C anchors: `nethack-c/upstream/src/apply.c:4151` `apply_ok()`, `apply.c:4184` gray-stone suggestion, `apply.c:4187` known non-touchstone exclusion, `apply.c:4394` gray-stone dispatch, `apply.c:2658` `touchstone_ok()`, and `apply.c:2680` `use_stone()`.
- JS anchor before work: `js/cmd.js:7728` only classified existing apply candidates and had no gray-stone `use_stone()` handoff.
- Implemented in `docs/c-parity-audit/156-gray-stone-apply-use-stone-2026-05-29.md`.
- Remaining from the agent: cursed-touchstone shatter, streak color/known gem output, real touchstone identification effects, and shared `#rub` routing.

## `#tip` Source Selection

- C `tip_ok()` excludes null and coins, suggests containers, suggests horn of plenty only when described and globally known, and downplays all other carried inventory.
- C `getobj()` keeps `?` limited to suggestions or fallback downplayed candidates, while `*` exposes full inventory.
- Current JS still over-suggests unknown horns and ordinary spillage-capable inventory as `#tip` sources.
- Safe next slice: add a carried `tipSelectionKind()`/menu split first, with direct ordinary-object selection printing C-shaped no-effect or spillage messages later.

## Down-Stairs Projectile Migration

- C `down_gate()` covers ordinary down stairs, branch/special stairs, down ladders, and seen holes/trapdoors.
- JS currently ships only seen hole/trapdoor projectiles and delivers queued objects randomly.
- Safe data shape: keep `_impact_drop_migrations` as object arrays, attach optional migration metadata per shipped object, and clear it after delivery.
- Safe next slice: ordinary down-stairs shipping with reciprocal up-stair delivery; defer ladders and special stairs.

## Lateral Wand Polymorph

- C lateral zaps use `bhit()` traversal, so a polymorph ray walks through range, handles monster-first ordering, and can continue after a monster with range penalty.
- JS still applies lateral wand polymorph only to the adjacent floor pile after the vertical-pile slice.
- Safe next slice: add one ray traversal row at a time, beginning with range-limited floor-pile targeting or monster-first ordering.

## Monster-Thrown Hit Follow-Ups

- C `drop_throw(obj, ohit, x, y)` breaks hit eggs/pies/venom first, may mulch surviving hit missiles, then places survivors and invokes passive object effects on the occupant.
- JS has an `ohit` parameter and break helpers, but call sites do not yet pass confirmed hit state and passive-object follow-up remains absent.
- Safe next slice: propagate `ohit: true` from already-confirmed hit paths only, then add a narrow passive-object erosion helper after placement.
