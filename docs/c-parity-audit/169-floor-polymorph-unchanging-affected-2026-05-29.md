# Floor Polymorph Unchanging Affected Return 2026-05-29

Implemented a narrow floor wand-polymorph parity slice. No private fixtures were inspected.

## C Anchors

- `unpolyable(o)` includes wands of polymorph, spellbooks of polymorph, potions of polymorph, and amulets of unchanging: `nethack-c/upstream/include/obj.h:429`.
- `obj_unpolyable()` combines that identity gate with ball/skin and resistance checks: `nethack-c/upstream/src/zap.c:1678`.
- `bhito()` returns zero when a polymorph object hit is blocked by `obj_unpolyable()`, before conduct, shudder, or `poly_obj()` handling: `nethack-c/upstream/src/zap.c:2119` and `nethack-c/upstream/src/zap.c:2191`.
- `bhito()` returns nonzero only after an actual object effect, including shudder destruction or `poly_obj()`: `nethack-c/upstream/src/zap.c:2206` and `nethack-c/upstream/src/zap.c:2219`.
- `bhitpile()` returns the sum of per-object `bhito()` effects, so a pile containing only unpolyable objects reports no hit effect: `nethack-c/upstream/src/zap.c:2428` and `nethack-c/upstream/src/zap.c:2481`.

## JS Work

- Added amulets of unchanging to the shared polymorph replacement-disallowed helper.
- Changed floor pile polymorph handling to track whether any object actually shuddered or was replaced.
- Floor pile polymorph now returns `false` and avoids redraw/object-list rewrites when every target is unpolyable or otherwise untouched.
- Kept the command action consumed after an object pile attempt, matching the current command wrapper behavior while making the helper's affected/no-effect result C-shaped for future beam routing.

## Public Tests

Added focused tests in `test/shop-billing-helpers.test.mjs`:

- `floor amulet of unchanging is unpolyable by wand polymorph`
- `floor polymorph reports no affected pile for wholly unpolyable objects`

Focused verification used:

- `node --check js/cmd.js`
- `node --test --test-name-pattern "floor .*polymorph|floor amulet of unchanging|wholly unpolyable" test/shop-billing-helpers.test.mjs`

## Fresh Subagent Findings Kept For Next Slices

- Stone-to-flesh statue work should start with saved `mkcorpstat()` monster traits and a shared `animateCorpstatStatue()` for floor spell effects and statue traps. Unique no-traits statues need C's directed doppelganger fallback; JS also currently over-defers some no-corpse statues.
- `#rub` has a compact command/menu slice: `?` already lists suggested rub candidates, but `*` should widen to full inventory and direct selection of an existing non-candidate should cancel with "That is a silly thing to rub."
- Monster-thrown `drop_throw(ohit)` needs hit-state threading plus hit-only missile mulch before down-gate shipping. Current helper covers egg hit breakage, but production arrow/dart hit callers can still skip the real landing decision.
- Carried gold command drops should opt into the carried down-gate shipping helper before local placement or shop donation. C treats gold as a normal dropped inventory object, then donates only after shipping and floor effects decline.
- Kicked-object down-gate shipping should start by adding a narrow floor-object kick path. Kicked no-drop semantics differ from projectile landing: a no-drop gate can affect the pile at the gate while the kicked object continues flight.

## Remaining Gaps

- Lateral wand polymorph still needs C `bhit()` range traversal and monster-first ordering.
- Upward hiding-under top-object behavior remains deferred until the JS hero hiding-under state is modeled.
- Floor boulders and post-polymorph boulder restacking remain separate pile-fidelity work.
- Broader `poly_obj()` replacement details and golem creation remain separate C-backed slices.
