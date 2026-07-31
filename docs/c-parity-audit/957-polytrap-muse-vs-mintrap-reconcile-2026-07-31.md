# Monster Polymorph Trap: MUSE_POLY_TRAP vs mintrap Reconciliation

## Scope

Close the five `test/shop-billing-helpers.test.mjs` polymorph-trap failures that
appeared after the were/wizard merges (regression actually introduced by
f7805c5's salvage of the "MUSE_POLY_TRAP deliberate poly-trap use" hunk from the
reverted 75d8ec6): the deliberately-jump path preempted the `mintrap()` path the
five tests exercise.

No replay maps, hidden tests, seeds, player names, or runtime shortcuts are used.

## Diagnosis

All five tests start a goblin at (7,5) with a `POLY_TRAP` at (6,5) — that is
*adjacent* — with the hero at (5,5), i.e. `dist2(m->mux, m->muy) = 4 <= 36`.
Two overlapping C paths matter:

1. `dochug()` runs `find_misc()` / `use_misc()` **before** `m_move()`
   (`monmove.c:797-800`). `find_misc()` selects `MUSE_POLY_TRAP` for any
   non-animal, non-mindless, mobile, non-trapped, non-shapeshifter monster with
   `mons[pmidx].difficulty < 6` when a polymorph trap is adjacent, the hero's
   known position is within dist2 36, and the monster is **not wearing iron
   shoes** (`muse.c:2108-2143`; difficulty gate `muse.c:2121`; iron-shoes gate
   `muse.c:2136-2137`, via `wearing_iron_shoes()` at `trap.c:1098-1102`).
   `use_misc()` (`muse.c:2519-2544`) then jumps the monster onto the trap and
   calls `newcham(mtmp, 0, NC_SHOW_MSG)` **with no resistance roll and no
   `mon_learns_traps()`** — the trap is not deleted.

2. `mintrap()` (`trap.c:3733`) / `trapeffect_poly_trap()` monster branch
   (`trap.c:2501-2524`): worn iron footwear warps iron shoes <-> kicking boots
   and stays worn (trap remains, not seen); `resists_magm()` monsters get
   `shieldeff_mon()` ("resists!", trap remains, **not** seen); otherwise a
   wand-class `resist()` roll then `newcham(...NC_SHOW_MSG)` with `seetrap()`
   when the monster is in sight. `POLY_TRAP` is not a floor trigger
   (`trap.c:1061` region: not in `floor_trigger()`'s list), so in-air monsters
   do not bypass it via `check_in_air()`.

Failure-by-failure:

- **"monster iron shoes warp ..."** — runtime bug. C excludes iron-shod
  monsters from `MUSE_POLY_TRAP` (`muse.c:2136-2137`); the JS
  `monsterUsePolyTrap()` lacked that gate and polymorphed the shod goblin
  through the MUSE path. Fixed in runtime; test unchanged (it matches C:
  mintrap warps the shoes via `trap.c:2501-2514`).
- Additionally the MUSE jump discarded all `newcham` feedback
  (`applyMonsterPolymorphTarget(mon, target, [], visible)`), dropping the
  "turns into" message C shows for a visible monster (`muse.c:2543` passes
  `NC_SHOW_MSG`). Fixed in runtime.
- **The other four tests contradicted C in their fixtures**: an adjacent,
  difficulty-1 goblin near the hero *must* deliberately jump per
  `muse.c:2120-2143` + `monmove.c:797-800`; the claimed mintrap behavior
  (wand-resist roll `rn2(111)`, `mtrapseen` learning bit, resist feedback for
  MR monsters) is unreachable in that configuration in C.

## Test fixes (loud section — tests were changed, with C refs)

The four non-iron-shoe tests now give the goblin fixture
`data: { difficulty: 6 }` (or merge it into existing data overrides). This is a
fixture constraint, not a runtime change: in C the `difficulty < 6` gate
(`muse.c:2121`) is the exact predicate that keeps `MUSE_POLY_TRAP` out of the
scenario, so the tests then legitimately exercise the
`mintrap()` -> `trapeffect_poly_trap()` path (`trap.c:3733`, `trap.c:2501-2524`)
they describe. No assertion semantics were loosened; each changed test carries
a comment citing `muse.c:2121` / `monmove.c:797-800`. The named-test intent
(pet path, in-air trigger, MR shield effect, visible polymorph) is preserved.

- `visible monster polymorph trap polymorphs monster and leaves trap` — fixture
  now difficulty 6 so C's MUSE preemption does not apply (muse.c:2121).
- `magic resistant monster polymorph trap is visible and leaves trap` — same;
  in C the MUSE path ignores MR entirely (muse.c:2519-2544 has no
  `resists_magm()` check), so the resist assertion is only reachable via
  mintrap (`trap.c:2516-2518` `shieldeff_mon()`; message per
  `mon.c` `shieldeff_mon()` "resists!").
- `in-air monster still triggers polymorph trap` — same fixture fix;
  POLY_TRAP stays triggered for flyers (not a floor trigger), asserted.
- `pet polymorph trap uses pet movement trap path` — same fixture fix;
  `find_misc()` has no tameness gate, so a low-difficulty pet adjacent to the
  trap would jump via MUSE in C too.

## JS Change

- `js/allmain.js` `monsterUsePolyTrap()`:
  - Added the `wearing_iron_shoes()` exclusion (C: `muse.c:2136-2137`,
    `trap.c:1098-1102), reusing the existing worn iron/kicking footwear check.
  - The deliberate jump now relays `applyMonsterPolymorphTarget()`'s feedback
    messages to the topline instead of discarding them (C: `muse.c:2543`
    `newcham(..., NC_SHOW_MSG)`; the "deliberately jumps onto" pline is
    `muse.c:2524-2530`).
- Call order at the `dochug()` equivalent (`find_misc`/`use_misc` before
  movement, `monmove.c:797-800`) was already correct and is unchanged.

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js')"` loads OK.
- `node --test test/shop-billing-helpers.test.mjs`: 3134/3134 pass (was 5
  failures: the five polymorph-trap tests).
- `node --test test/*.test.mjs`: 3637/3637 pass.
- `bash frozen/score.sh`: **44/44 passing** (RNG + screen parity unchanged;
  neither fix consumes or reorders RNG).

## Remaining Work

- The MUSE jump path still uses the general random-polymorph target helper;
  `use_misc()`'s exact `newcham()` fallout (armor breakage, inventory drops,
  worm handling via `worm_move()` at muse.c:2537-2540) is not fully modeled.
- `m_harmless_trap()` / monster trap-pathing interplay for *known* polymorph
  traps (avoidance with `rn2(4)` is modeled; route selection parity is broader
  than this slice — see doc 538's remaining-work note).
