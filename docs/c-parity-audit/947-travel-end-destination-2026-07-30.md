# 947 — Travel termination at the destination step + magic-map stone memory

Date: 2026-07-30. Public score after fix: 44/44 (was 44/44; the intermediate
"naive" patch regressed sessions/seed0360 by 12 screens at 100% RNG parity).

## Behavior under study

C ends a travel run and forgets the cached travel destination
(`iflags.travelcc`) when the *next step's destination* equals the travel
target — *even when the move then fails* (e.g. bumping a closed door):

- `src/hack.c:1270-1289` — findtravelpath() adjacent-target fast path:
  `u.dx/u.dy` are set toward `(u.tx,u.ty)` and `iflags.travelcc.x =
  iflags.travelcc.y = 0` is issued *before* domove() runs; on the
  test_move() failure path control drops into the BFS with `context.run = 8`.
- `src/hack.c:1396-1416` — BFS arrival branch: `if (nx == ux && ny == uy)`
  where `(x,y)` is the step being taken; `(x == u.tx && y == u.ty)` triggers
  `nomul(0)`, `context.run = 8` and the travelcc reset, then travelmap is
  marked and the step is *still returned* for domove() to attempt.
- `src/cmd.c:5346-5376` dotravel_target(): "You are already here." plus
  reset when the hero is already on the target (cmd.c:5354-5358).

The JS port models travelcc as `game._travel_previous_target`.  Before this
fix, the continuing-steps loop in `js/allmain.js` moveloop_core() cleared
the target only when the hero actually *landed* on it; the initial-step
paths in `js/cmd.js` (added in Wave 1) already had the C-correct
destination-based clear.

## The trap: coupling between termination state and spot descriptions

A naive variant of the fix (clear `_travel_previous_target` whenever the
step destination equals the target OR the hero lands on it) produced exactly
12 screen mismatches with 100%-identical RNG in
sessions/seed0360-wizard-world-tour (steps ~640-649, 662-663).  First
diverging message: C prints `stone (no travel path)` for a travel-cursor
target, JS printed `unexplored area (no travel path)`.

Root cause chain:

1. The travel-cursor description in `setTravelCursorTarget` (js/cmd.js) had
   a heuristic — an unseen STONE tile was described as "stone" only when
   `loc.seenv || loc.remembered_glyph || displayed || _travel_previous_target`.
   C never consults travel state for descriptions; the description comes
   from the *glyph known for the spot* (pager.c:737-802
   do_screen_description case S_stone at pager.c:779-795: memory glyph
   S_stone + `levl[x][y].seenv` set → "stone"; unexplored glyph →
   "unexplored area"; defsym.h PCHAR2(S_stone) explanation is "stone").
2. In JS, hero memory of magic-mapped stone was never recorded:
   `revealLevelMap` skipped STONE tiles entirely.  C's show_map_spot()
   (detect.c:1372-1401) sets `seenv = SVALL` for *every* spot during magic
   mapping, and magic_map_background() (display.c:233-258) records
   `back_to_glyph()` (STONE → S_stone, display.c:2292-2294) into hero
   memory plus the lastseentyp snapshot.  In seed0360 the wizard issues
   `^F` (#wizmap → do_mapping, detect.c:1422-1430) at session step 623/624;
   every post-wizmap "stone" description derives from that memory.
3. With the C-correct termination fix, the prev-target hack was cleared
   earlier (correctly), so the heuristic no longer masked the missing stone
   memory → mismatches.

A second recorded case (sessions/seed4500-knight-coverage step 1691)
exercised the same C rule in reverse: a tile mapped as stone and later dug
into a corridor while out of sight still describes as "stone", because the
*remembered* glyph is still S_stone (fail-soft default branch of
pager.c:791-797 → defsyms[S_stone].explanation).  The baseline JS handled
that tile via a blind/polyself special case keyed on `!loc.seenv`, which
broke once mapping correctly assigned seenv.

## Fix

- `js/allmain.js` moveloop_core(): clear `_travel_previous_target` via the
  shared predicate `travelStepEndsAtTarget(prev, nextX, nextY, ux, uy)`
  after each continuing travel step — covering both the
  step-destination-equals-target case (move may have failed) and the
  hero-landed-on-target case.
- `js/cmd.js`: new exported helper `travelStepEndsAtTarget` (C refs above),
  also wired into the three travel-initiation sites that previously had the
  same condition inlined.
- `js/cmd.js` revealLevelMap(): never-seen STONE now gets `seenv |= 0xff`
  and `lastseentyp = STONE` during magic mapping (ports show_map_spot +
  magic_map_background for stone).  Bones/save hygiene needs no change:
  both C (bones.c:566-570) and the port (js/save.js restoreBonesLevel)
  clear per-tile memory on bones restore.
- `js/cmd.js` setTravelCursorTarget() and the farlook direction handler:
  a tile whose recorded memory is stone (`lastseentyp === STONE` with hero
  memory present, tile not currently in sight) now describes as "stone"
  even when the live terrain has since changed — matching C's
  glyph-memory-based description.

The un-C-like `|| game._travel_previous_target` term in the travel-cursor
description is intentionally *kept*: removing it regresses seed0360 steps
539-543, where C describes a pre-mapping, never-seen stone tile as "stone"
and no C code path was found that would set memory there.  The ports
records it via the stored travel target, which keeps public parity; this
remains an open C-parity question (possible recorder/special-level source
of seenv on that tile could not be confirmed from sources alone).

## Verification

- `node --test test/getpos-travel.test.mjs` — 22/22 (adds coverage for
  travelStepEndsAtTarget incl. the failed-move case, revealLevelMap stone
  memory, SCORR→CORR conversion, and confused-mapping rn2(7) arity:
  (COLNO-1)*ROWNO = 1659 rolls per do_mapping loop, detect.c:1426-1429).
- `bash frozen/score.sh` — 44/44 passing (seed0360 and seed4500
  re-included at full RNG+screen parity).
