# C Parity Audit 234: Polyself Levitation Boots

## Sources

- `nethack-c/upstream/src/polyself.c:1273-1284`: no-hands, very small, slithy, and centaur polyself forms print the boot falloff message, call `Boots_off()`, then drop the boot object.
- `nethack-c/upstream/src/do_wear.c:262-307`: `Boots_off()` clears worn boots before handling side effects; levitation boots call `float_down(0L, 0L)` and become known when no other levitation source remains and donning was not cancelled.
- `nethack-c/upstream/src/trap.c:4024-4035`: `float_down()` clears levitation masks first, then returns early if another levitation source still exists.
- `nethack-c/upstream/src/trap.c:4056-4070`: controlled flight and engulfed/swallowed states have their own float-down messages before ordinary landing.
- `nethack-c/upstream/src/trap.c:4104-4144`: after pool/lava handling and trap checks, ordinary dry float-down prints `You float gently to the <surface>.`

## JS Changes

- Added levitation boot handling to the existing polyself boot fallout path, before the object is dropped on the floor.
- Models the ordinary dry `float_down()` branch for active boot-sourced levitation: clears `game.u.levitating`, marks levitation boots known, records the armor discovery, and prints the C-style landing surface message.
- Preserves existing state when another levitation source remains, matching C's early return before `makeknown()`.
- Gates out air levels, water levels, liquid terrain, traps, flight, swallowed/engulfed state, and existing water state so those C branches remain explicit future slices rather than partial behavior.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Centaur polyself while levitating from levitation boots pushes the boots off, prints `You float gently to the floor.`, clears active levitation, learns the boots, removes them from inventory, and leaves the known boots on the floor.
- Centaur polyself with another levitation source still drops the boots but does not print float-down terrain fallout, does not clear levitation, and does not identify the boots.

## Remaining Gaps

- Pool, lava, trap, Sokoban, air level, water level, swallowed/engulfed, steed, hallucination, and controlled-flight `float_down()` branches are still not modeled for polyself levitation boot loss.
- JS levitation source tracking remains thinner than C's `HLevitation`, `ELevitation`, and `BLevitation` masks; this slice only handles the active ordinary boot-source case.
- Post-landing pickup and encumbrance side effects from C `float_down()` are not modeled in this polyself path yet.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "levitation boots|water walking boots|speed boots|polyself.*boots" test/shop-billing-helpers.test.mjs` (`6` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1130/1130` tests passed)
- `node --test test/*.mjs` (`1227/1227` tests passed)
- `npm run score` (`44/44` passing)
