# Subagent Findings 2026-05-29

Fresh read-only agents audited five separate C parity areas. No private-suite details were used.

## Implemented Slice: Vertical Wand Polymorph

- C anchors: `nethack-c/upstream/src/zap.c:3219` `zap_updown()`, `zap.c:3382` downward `bhitpile()`, `zap.c:3391` upward hiding-under exception, `zap.c:2428` pile walk, `zap.c:2191` object polymorph.
- JS anchor before work: `js/cmd.js:44506` accepted only lateral movement plus self-zap for polymorph wands.
- Implemented in `docs/c-parity-audit/154-wand-polymorph-vertical-pile-2026-05-29.md`.
- Remaining from the agent: lateral range traversal, monster-first ordering, upward hiding-under top-object handling, boulder inclusion, and pile restacking.

## `#tip` Source Selection

- C `tip_ok()` excludes hands/coins, suggests containers, suggests horn of plenty only when described and globally known, and downplays other carried inventory.
- C `getobj()` prompt uses suggested letters, `?` shows suggestions or downplayed fallback, and `*` shows full inventory.
- Current JS still over-suggests unknown horns/spillage-capable objects and lacks the full suggested/downplayed/full carried split for `#tip`.
- Safe next slice: add `tipSelectionKind()` and carry only the selection contract first; keep floor-container and target mechanics unchanged.

## Gray Stone `#apply`

- C `apply_ok()` suggests unknown gray stones and known touchstones, while known non-touchstone gray stones are selectable only from full inventory.
- C dispatches all gray stones through `use_stone()`, which then asks what to rub on the stone.
- Current JS has gray-stone metadata but no apply selection or `use_stone()` handoff.
- Safe next slice: add gray-stone apply classification plus a narrow second prompt/cancel path before implementing touchstone effects.

## Down-Stairs Projectile Migration

- C `down_gate()` covers ordinary down stairs, branch/special stairs, down ladders, and seen holes/trapdoors.
- JS currently ships only seen hole/trapdoor projectiles and delivers all queued objects randomly.
- Safe data shape: keep `_impact_drop_migrations` as `Map<string, object[]>`, attach optional `_migration` metadata to queued objects, and clear it on delivery.
- Safe next slice: ordinary down-stairs shipping with reciprocal up-stair delivery; defer ladders and special stairs.

## Monster-Thrown Hit Follow-Ups

- C `drop_throw(obj, ohit, x, y)` breaks hit eggs/pies/venom first, may mulch surviving hit missiles, then places surviving objects and invokes `passive_obj()` on the occupant.
- JS has an `ohit` parameter and break logic but call sites do not pass hit state, and no passive-object follow-up runs after placement.
- Safe next slice: pass `ohit: true` only from already-confirmed hit paths, then add a narrow supported passive-object erosion helper after placement.
