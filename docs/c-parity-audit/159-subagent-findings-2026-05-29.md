# Subagent Findings 2026-05-29

Fresh read-only agents audited five separate C parity areas. No private-suite details were used.

## Implemented Slice: Carried `#tip` Getobj Selection

- C anchors: `nethack-c/upstream/src/pickup.c:3481` `tip_ok()`, `pickup.c:3624` carried `getobj("tip")`, `pickup.c:3633` spillage, `pickup.c:3667` ordinary no-effect branches, and `invent.c:1872`/`invent.c:1963` suggested/downplayed menu splitting.
- JS anchor before work: `js/cmd.js:51174` filtered carried `#tip` to source/spillage objects and auto-confirmed one carried candidate.
- Implemented in `docs/c-parity-audit/158-tip-carried-getobj-selection-2026-05-29.md`.
- Remaining from the agent: helmet `tiphat()`, broader destination-menu fidelity, and reusable `getobj()` primitives.

## Ordinary Stairs And Ladder Shipping

- C `down_gate()` maps down stairs to `MIGR_STAIRS_UP`, down ladders to `MIGR_LADDER_UP`, and seen holes/trapdoors to `MIGR_RANDOM`.
- C stores per-object migration metadata and delivers stair/ladder objects at the reciprocal up stair/ladder.
- JS still has a `Map<levelKey, object[]>` random-delivery queue and only gates seen holes/trapdoors.
- Safe next slice: attach optional `_migration` metadata to queued objects and implement same-dungeon ordinary stairs/ladders before branch/special-stair support.

## Lateral Wand Polymorph

- C lateral polymorph wands use `bhit(u.dx, u.dy, rn1(8, 6), ZAPPED_WAND, bhitm, bhito, &obj)`.
- C checks monsters before piles on each square, continues after polymorph monster hits, and subtracts extra range for monster hits.
- JS still handles lateral polymorph as a one-square floor-pile helper.
- Safe next slice: refactor the pile helper into a per-square core, then add range-limited pile-only traversal before monster-first ordering.

## Monster-Thrown Hit Follow-Ups

- C `drop_throw(obj, ohit, x, y)` breaks hit eggs, can mulch surviving hit missiles, and then applies `passive_obj()` to surviving placed objects before stacking.
- JS has an `ohit` parameter but call sites mostly omit hit state, and landing only uses `ohit` for eggs.
- Safe next slice: add C-shaped hit missile mulch in `landMonsterThrownObject()` first, then thread `ohit` from confirmed hit paths and add a narrow passive-object mutation helper.

## Touchstone And `#rub`

- C `#rub` routes gray stones through the same `use_stone()` path as `#apply`.
- C `use_stone()` observes the source stone if sighted, handles cursed touchstone shatter before blind/hallucination fallback, and only identifies gems under effective touchstone conditions.
- JS has the apply prompt but `#rub` still only sees lamps and royal jelly, and `finishUseStone()` currently stops at self/blind/hallucination/generic scritch.
- Safe next slice: add gray stones to `#rub`, sighted source observation, and then cursed touchstone shatter before full streak/identification work.
