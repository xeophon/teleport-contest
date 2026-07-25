# Subagent Findings 937 - Magic Trap / Boulder Plug / Scroll Read Rolls

Bundle: misc effect rolls audited from the seed9003/9004/9005 wizard sessions
against `nethack-c/upstream` (NetHack-5.0.0_Release).

## Implemented Slice

### (a) Magic trap `dotrap()` escape roll + `paranoid_confirmation:trap`

C source:

- `nethack-c/upstream/src/trap.c:3035-3044`: every hero `dotrap()` trigger on an
  already-seen, non-undestroyable, non-ANTI_MAGIC trap consumes `rn2(5)` and
  escapes the trap on zero, before the trap effect. `undestroyable_trap()` is
  only MAGIC_PORTAL/VIBRATING_SQUARE (`include/trap.h:116`), so MAGIC_TRAP
  always rolls when seen.
- `nethack-c/upstream/src/trap.c:2293-2320`: `trapeffect_magic_trap()` runs
  `seetrap()` then `rn2(30)`; `domagictrap()` rolls `rnd(20)` (trap.c:4319).
- `nethack-c/upstream/src/sit.c:503`: sitting on a trap goes through the same
  `dotrap(trap, VIASITTING)`, so the escape roll applies there too.
- `nethack-c/upstream/src/hack.c:2552-2579`: with `paranoid_confirmation:trap`
  (default-on, `options.c:7173`), moving onto a discovered trap that is not
  `TRAP_CLEARLY_IMMUNE` asks `Really step onto that <trap>?` first; declining
  cancels the move without time passing.
- `nethack-c/upstream/src/trap.c:2796-2934`: `immune_to_trap()` hero cases
  (VIBRATING_SQUARE never prompts; ground traps skipped by levitation/flying;
  MAGIC_TRAP/ANTI_MAGIC/fire family always prompt).
- `nethack-c/upstream/src/trap.c:5375-5387`: `into_vs_onto()` prepositions
  (holes/pits/teleports/webs are "into").

JS changes:

- `js/cmd.js` `magicTrapResult()` now performs the seen-trap escape check
  (`movementTrapAlreadySeen && sitTrapEscapeAllowed && !rn2(5)`) before
  `seetrap` and the `rn2(30)`/`rnd(20)` effect, returning
  `You escape a magic trap.` on success. All hero dotrap-equivalent callers
  (movement, `#sit`, and the deferred object-list landings) share it;
  `movementMagicTrapResult()` no longer rolls its own copy, and the sit path
  no longer pre-sets `tseen` (C captures `already_seen` at dotrap entry).
- `js/cmd.js` adds `heroClearlyImmuneToTrapType()` (hero side of
  `immune_to_trap`), `intoVsOntoTrapType()`, and `heroMustConfirmTrapStep()`,
  and moveHero now gates the move on `confirmTrapStep` with the exact
  `Really step onto that magic trap? [yn] (n)` prompt; `y` re-runs the move
  past the prompt, anything else cancels with `context.move = 0`.

Session evidence (seed9004-wizard-fountain-oracle): first RNG divergence moved
from rng[5270] (step 16, missing `rn2(5)`) to rng[5883] (step 79, wish path:
`rnd_otyp_by_namedesc` objnam.c:3522 / `next_ident` mkobj.c:521 /
`blessorcurse` mkobj.c:1846 / `makewish` zap.c:6421 — separate wish bundle).
Screen parity at step 15 (prompt) and step 16 now matches.

### (b) Boulder-into-hole plug `obj_resists` roll

C source:

- `nethack-c/upstream/src/hack.c:530-566`: `moverock_core()` plug cases skip
  `dopush()` entirely, so there is no `exercise(A_STR, TRUE)` and no
  "With great effort" message for these destinations. PIT/SPIKED_PIT route
  through `flooreffects()`; HOLE/TRAPDOOR plug inline with the distinct
  `The boulder falls into and plugs a hole in the floor!` (or `Kerplunk!`
  when blind).
- `nethack-c/upstream/src/invent.c:1446`: `delobj_core()` calls
  `obj_resists(obj, 0, 0)`, consuming `rn2(100)` (zap.c:1469), for every
  ordinary object deletion — including the `useupf()`'d plugging boulder.
- `nethack-c/upstream/src/dig.c:2007`: `bury_an_obj()` rolls
  `obj_resists(otmp, 0, 0)` again per buried object.
- `nethack-c/upstream/src/do.c:187-269`: `flooreffects()` boulder plug order is
  occupant effects, `delfloortrap`, `useupf` (roll), `bury_objs` (rolls).

JS changes:

- moveHero's push flow now handles trap destinations: HOLE/TRAPDOOR plug with
  the C message via `pushedBoulderHolePlugMessage()`; PIT/SPIKED_PIT route
  through `earthFloorEffects()` (`flooreffects()` equivalent). Both consume
  the boulder, remove the trap, bury objects, and skip the push exercise.
- `earthBoulderPitHoleEffects()` and the HOLE/TRAPDOOR push branch consume
  `rn2(100)` for the `useupf() -> delobj() -> obj_resists(obj, 0, 0)` of the
  plugging boulder, positioned after trap deletion and before `bury_objs()`.

Session evidence (seed9005-wizard-sokoban): first RNG divergence moved from
rng[6438] (step 41 plug) to rng[8199] (step 95, potion-quaff path — separate
bundle). seed9005-arrive-sokoban now matches all 5558 RNG calls (the two
remaining screen diffs are an unrelated stair-glyph display issue).

### (c) Scroll-read wisdom exercises

C source:

- `nethack-c/upstream/src/read.c:2199-2200`: `seffects()` exercises
  `exercise(A_WIS, TRUE)` (attrib.c:509, `rn2(19)`) per magic-scroll read —
  already present in the JS read paths.
- `nethack-c/upstream/src/read.c:635-641` + `nethack-c/upstream/src/o_init.c:483`:
  when the scroll type is discovered by the read, `learnscroll()` runs after
  `seffects()` returns and `discover_object(..., credit_hero=TRUE)` exercises
  wisdom again. Verified live with the recorder's `NH_EXERCISE_DEBUG` hook:
  seed9003's second exercise is `discover_object(o_init.c:483)`, not a second
  seffects roll (the assignment's read.c:2200 diagnosis covers only the first).

JS changes (landed concurrently in the same region, verified against C):

- The genocide scroll flow records `learnedNewType: !alreadyKnown` in
  `_genocide_pending` and `endGenocidePrompt()` exercises wisdom after the
  effect completes (also on the confused inline path), matching the
  `learnscroll()` position after `seffects()`.

Session evidence (seed9003-wizard-genocide): RNG now matches all 2493 calls.

### (d) Read-prompt letter compaction

C source: `nethack-c/upstream/src/invent.c:1907-1909` compacts the suggestion
letters only when more than five are suggested, via
`compactify()` (invent.c:1625-1660: runs of 3+ letters dash, runs of 2 stay).

Finding: the JS `compactInventoryLetters()`/`getobjPromptLetters()` already
mirror this (`>5` threshold, `ijklmop -> i-mop`, `ijklmo -> i-mo`). The
observed `[ijklm]` vs `[i-mo]` at seed9004 step 81 was not a compaction bug:
the wished scroll never entered the JS inventory because the wish flow had
derailed (see (a)'s remaining wish bundle), so the JS suggestion set was
genuinely missing `o`. Locked in with unit tests.

### (e) `#genocided` window

C source: `nethack-c/upstream/src/insight.c:3007-3115` (`list_genocided`) and
`insight.c:2620-2714` (`vanqsort_cmp`, default `VANQ_MLVL_MNDX` = monster level
high-to-low with `mons[]` index tiebreak); tty window placement
`win/tty/wintty.c:1902-1946` (overlay column from content width, `putchar(' ')`
at `offx` then text).

JS changes: `genocideListLines()` now emits `Genocided species:` at col 41, a
blank line, ` <plural>` entries sorted by mlevel high-to-low with the
RNDMONST index tiebreak (reusing `VANQUISHED_MONSTER_DATA`), a blank line,
and the `N species genocided.` footer; both callers clear from col 40 so the
map under the window's left edge is preserved, and the genocide-prompt `?`
help path reports `No creatures have been genocided yet.` via the message
line when the list is empty (insight.c:3122-3125).

Session evidence (seed9003): the 4-species and 7-species windows at steps 99
and 148 now match byte-for-byte (remaining screen diffs are a separate
monster-glyph visibility issue after cursed-genocide "Sent in some newts.").

## Regression Coverage

- `test/misc-effect-rolls.test.mjs` (11 tests): escape-roll order and values,
  unseen-trap skip, trap confirmation prompt/confirm/decline/unseen,
  push-plug state + `rn2(100)` + no `rn2(19)`, genocide discovery exercise,
  compactify cases, `#genocided` exact row layout.
- `test/shop-billing-helpers.test.mjs` fixture reconciliation for the two
  C-verified behavior changes above: five boulder pit-fill fixtures now expect
  the `useupf() -> delobj() -> obj_resists(,0,0)` `rn2(100)` (invent.c:1446),
  and seven known-trap movement fixtures answer the default-on
  paranoid_confirmation:trap prompt (`Really step onto that ...?`) before
  reaching the escape roll they assert.

## Deliberately Excluded / Follow-Ups

- Wish-grant object creation (`rnd_otyp_by_namedesc`, `next_ident`,
  `blessorcurse`, `makewish`) — seed9004's next divergence, separate bundle.
- Potion-quaff effects — seed9005-wizard-sokoban step 95 divergence.
- `#genocided` "(extinct)" suffixes and `Extinct species:` headers
  (insight.c:3102-3103,3112-3115); the JS does not track extinctions yet.
- Hallucinated trap-confirm shows a random trap name (`rnd(TRAPNUM - 1)`,
  hack.c:2565); not exercised by the current sessions.
- Clinger-at-ceiling trap immunity and full `is_rustprone()` material logic
  are approximated in `heroClearlyImmuneToTrapType()`; no session coverage.
