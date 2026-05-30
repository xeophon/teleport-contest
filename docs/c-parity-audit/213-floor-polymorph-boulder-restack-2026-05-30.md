# C Parity Audit 213: Floor Polymorph Boulder Restack

## Sources

- `nethack-c/upstream/src/zap.c:2191-2221`: wand and spell polymorph object hits share the `bhito()` branch; boulders are not excluded before conduct, shudder, or `poly_obj()`.
- `nethack-c/upstream/src/zap.c:1676-1682`: `obj_unpolyable()` blocks intrinsically unpolyable objects, the iron ball, the hero skin, and resistant objects, but not boulders.
- `nethack-c/upstream/src/zap.c:1702-1725`: `poly_obj(..., STRANGE_OBJECT)` creates a random object from the source object's class; boulders call `sokoban_guilt()` before replacement.
- `nethack-c/upstream/include/objects.h:1619-1622`: rock-class polymorph results include boulders and statues.
- `nethack-c/upstream/src/zap.c:1900-1903` and `nethack-c/upstream/src/mkobj.c:665-672`: floor object replacement preserves the old object's same-square chain position.
- `nethack-c/upstream/src/zap.c:2487-2500`: after `bhitpile()` processes a pile, boulders found below non-boulders trigger `recreate_pile_at()`.
- `nethack-c/upstream/src/mkobj.c:2303-2349` and `2368-2388`: recreated piles preserve order except that `place_object()` keeps boulders on top of non-boulders.
- `nethack-c/upstream/src/zap.c:3391-3407`: the upward hiding-under direct-hit path calls `bhito()` directly rather than `bhitpile()`, so this restack pass does not apply there.

## JS Changes

- Added rock-class recognition to polymorph object class helpers so boulders and statues use the rock-class replacement pool.
- Removed the floor-pile boulder exclusion from wand polymorph object targeting.
- Added rock-class floor polymorph replacement through `mkobj(ROCK_CLASS, false)`, preserving floor coordinates, quantity, BUC state, and cleanup through the existing floor polymorph replacement helper.
- Applied Sokoban guilt when a boulder is successfully transformed through normal object polymorph.
- Added a `restackFloorBouldersAt()` pass for `bhitpile()`-like pile processing, moving same-square boulders to the top while preserving non-boulder and boulder relative order.
- Kept the upward hiding-under direct-hit path from audit 212 out of the restack pass to match C's `zap_updown()` special case.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- A downward polymorph wand zap can affect a floor boulder and applies Sokoban guilt on successful boulder transformation.
- A downward polymorph wand zap that turns a lower statue into a boulder restacks that new boulder above the unpolyable top cover object.

## Remaining Gaps

- Full `poly_obj()` fidelity for non-rock classes remains broader than the current floor-pile helper.
- Rock-class statue replacement details are still approximate, including exact monster selection, statue contents fallout, and generated statue metadata.
- Golem creation from object shudder material via `create_polymon()`/`polyuse()` remains unmodeled.
- Spell polymorph still needs a separate command-path slice to route player spell casting into the existing object pile helper.
- Boulder vision blocking, liquid fracture, and exact `block_point()`/`unblock_point()` side effects are not modeled here.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="floor polymorph (can polymorph a boulder|restacks newly created boulders|downward hits|upward while hiding|downward while hiding|lateral)" test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1090/1090`)
- `node --test test/*.mjs` (`1187/1187`)
- `npm run score` (`44/44`)
